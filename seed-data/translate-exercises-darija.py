#!/usr/bin/env python3
"""
Big Boss Fitness — Traduit les noms d'exercices manquants en darija casual via GPT-4o-mini.

Cible : tous les exos où name_darija IS NULL OR '' OR identique au name_fr.
Lit BBF_OPENAI_API_KEY depuis backend/.env (pas de clé hardcodée).
"""
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

# Force UTF-8 console on Windows (arabe characters)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "backend" / ".env"


def load_env():
    cfg = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip()
    return cfg


CFG = load_env()
API_KEY = CFG.get("BBF_OPENAI_API_KEY")
if not API_KEY:
    print("ERROR: BBF_OPENAI_API_KEY not found in backend/.env", file=sys.stderr)
    sys.exit(1)


SYSTEM_MSG = (
    "Tu es un coach fitness marocain qui parle darija casual. "
    "Traduis le nom de l'exercice en darija avec arabic script. "
    "Garde les termes techniques anglais courants au gym (squat, curl, bench, deadlift...) "
    "translittérés en arabe quand ils existent en darija parlée. "
    "Réponds UNIQUEMENT avec le nom traduit, sans guillemets, sans explication, sans préfixe."
)


def build_prompt(name_fr: str, muscle: str) -> str:
    return (
        f"Nom de l'exercice (français) : {name_fr}\n"
        f"Muscle ciblé : {muscle}\n\n"
        "Traduis ce nom en darija marocain casual (arabic script). "
        "Style : court, naturel, comme un coach au gym à Casa parle à son client. "
        "Exemples du style attendu :\n"
        "- 'Squat avec barre' → 'سكوات بالبار'\n"
        "- 'Curl biceps haltère' → 'كرل البايسبس بالدامبل'\n"
        "- 'Tirage barre' → 'تيراج بار'\n"
        "- 'Élévation latérale' → 'رفعة جانبية'\n"
        "- 'Burpee sans saut' → 'بوربي بلا قفز'\n"
        "- 'Développé couché incliné' → 'بنش بريس مايل'\n\n"
        "Réponds avec UNIQUEMENT le nom darija (1 ligne, pas de guillemets)."
    )


def call_gpt(prompt: str, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            body = json.dumps({
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": SYSTEM_MSG},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.4,
                "max_tokens": 80,
            }).encode()
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=body,
                headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            )
            resp = urllib.request.urlopen(req, timeout=30)
            data = json.loads(resp.read())
            content = data["choices"][0]["message"]["content"].strip()
            # Strip surrounding quotes if any (ASCII + typographic)
            for q in ['"', "'", "«", "»", "“", "”", "‘", "’"]:
                content = content.strip(q)
            return content.strip()
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
            else:
                raise


def db_query(sql: str) -> str:
    result = subprocess.run(
        ["docker", "exec", "-i", "bigboss-postgres", "psql", "-U", "bigboss",
         "-d", "bigbossfitness", "-t", "-A", "-c", sql],
        capture_output=True, text=True, encoding="utf-8",
    )
    return result.stdout.strip()


def db_exec(sql: str) -> bool:
    proc = subprocess.run(
        ["docker", "exec", "-i", "bigboss-postgres", "psql", "-U", "bigboss",
         "-d", "bigbossfitness", "-c", sql],
        capture_output=True, text=True, encoding="utf-8",
    )
    return "UPDATE 1" in proc.stdout


def esc(value: str) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def main():
    # Optional --limit N for safe testing
    limit_n = None
    if "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        if idx + 1 < len(sys.argv):
            limit_n = int(sys.argv[idx + 1])

    where = "WHERE name_darija IS NULL OR name_darija = '' OR name_darija = name_fr"
    limit_clause = f"LIMIT {limit_n}" if limit_n else ""
    rows = db_query(f"""
SELECT id, name_fr, primary_muscle
FROM exercises
{where}
ORDER BY name_fr
{limit_clause}
""")

    items = []
    for line in rows.split("\n"):
        if not line.strip():
            continue
        parts = line.split("|")
        if len(parts) >= 3:
            items.append({"id": parts[0], "name_fr": parts[1], "muscle": parts[2]})

    total = len(items)
    print(f"{'=' * 60}")
    print(f"Translating {total} exercises to Darija")
    print(f"{'=' * 60}")

    success = 0
    failed = 0
    failed_list = []

    for i, ex in enumerate(items):
        sys.stdout.write(f"\r[{i+1}/{total}] {ex['name_fr'][:50]:<50}")
        sys.stdout.flush()

        try:
            prompt = build_prompt(ex["name_fr"], ex["muscle"])
            darija = call_gpt(prompt)

            # sanity check: should contain arabic script
            has_arabic = any('؀' <= c <= 'ۿ' for c in darija)
            if not has_arabic:
                failed += 1
                failed_list.append(f"{ex['name_fr']} -> {darija} (no arabic)")
                continue

            # truncate to 200 chars (db column varchar(200))
            darija = darija[:200]

            sql = f"UPDATE exercises SET name_darija = {esc(darija)} WHERE id = '{ex['id']}'"
            if db_exec(sql):
                success += 1
            else:
                failed += 1
                failed_list.append(f"{ex['name_fr']}: SQL update failed")

        except Exception as e:
            failed += 1
            failed_list.append(f"{ex['name_fr']}: {str(e)[:80]}")
            print(f"\n  ERROR: {e}")

        time.sleep(0.35)

    print(f"\n{'=' * 60}")
    print(f"DONE!")
    print(f"  Success: {success}/{total}")
    print(f"  Failed:  {failed}")
    if failed_list:
        print("\nFailed items:")
        for f in failed_list[:30]:
            print(f"  - {f}")
        if len(failed_list) > 30:
            print(f"  ... and {len(failed_list) - 30} more")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
