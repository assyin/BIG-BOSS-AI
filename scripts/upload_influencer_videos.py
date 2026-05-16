#!/usr/bin/env python3
"""
Upload influencer-recorded videos to Cloudflare R2 + update DB.

Workflow:
  1. Influenceur livre 100 fichiers nommés `INF_<muscle>_<slug>.mp4`
  2. Tu les colles dans `influencer-videos/` à la racine du repo
  3. Tu run ce script (--dry-run d'abord, --apply pour vraiment)

Le script:
  - Lit `Influenceur_100_Exercices_Recording.xlsx` pour le mapping fichier → exercise_id
  - Pour chaque fichier trouvé dans `influencer-videos/`:
    a. Upload vers R2 sous le préfixe `influencer/<muscle>/<slug>.mp4`
    b. Update le champ DB (`video_demo_url` par défaut, ou autre selon --field)
    c. Sauvegarde l'ancien URL dans `video_demo_url_legacy` (champ optionnel)

Usage:
  python scripts/upload_influencer_videos.py --dry-run          # preview
  python scripts/upload_influencer_videos.py --apply            # vraiment upload + update DB
  python scripts/upload_influencer_videos.py --apply --field video_form

Requires: pip install boto3 openpyxl
Reads BBF_R2_* credentials from backend/.env.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    import boto3
    from botocore.config import Config
    from openpyxl import load_workbook
except ImportError as e:
    print(f"Missing dependency: {e}", file=sys.stderr)
    print("Install: pip install boto3 openpyxl", file=sys.stderr)
    sys.exit(1)


# Force UTF-8 console on Windows (arabe + accents)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ─── Paths ────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "backend" / ".env"
EXCEL_FILE = ROOT / "Influenceur_100_Exercices_Recording.xlsx"
LOCAL_VIDEOS_DIR = ROOT / "influencer-videos"

ALLOWED_FIELDS = {
    "video_demo_url",
    "video_form_url",
    "video_mistakes_url",
    "video_tips_url",
}


# ─── Env loader ───────────────────────────────────────────────
def load_env() -> dict:
    cfg = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip()
    return cfg


# ─── Excel mapping loader ─────────────────────────────────────
def load_excel_mapping() -> dict:
    """Retourne { filename: { exercise_id, muscle, slug, name_fr } }."""
    if not EXCEL_FILE.exists():
        print(f"ERROR: Excel introuvable: {EXCEL_FILE}", file=sys.stderr)
        sys.exit(1)

    wb = load_workbook(EXCEL_FILE, read_only=True)
    ws = wb["100 Exercices"]

    mapping = {}
    # Skip header (row 1)
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or row[0] is None:
            continue
        _, muscle_fr, _, _, name_fr, _, _, filename, _, db_id, *_ = row
        if not filename or not db_id:
            continue
        # Filename example: "INF_chest_dips.mp4" → muscle="chest", slug="dips"
        # Parse to extract muscle + slug
        base = filename.replace(".mp4", "")
        if not base.startswith("INF_"):
            continue
        parts = base[4:].split("_", 1)
        if len(parts) != 2:
            continue
        muscle, slug = parts
        mapping[filename] = {
            "exercise_id": str(db_id).strip(),
            "muscle": muscle,
            "slug": slug,
            "name_fr": str(name_fr or ""),
        }
    return mapping


# ─── DB helpers ───────────────────────────────────────────────
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


def esc(v: str) -> str:
    return "'" + str(v).replace("'", "''") + "'"


# ─── Main ─────────────────────────────────────────────────────
def main() -> int:
    parser = argparse.ArgumentParser(description="Upload influencer videos to R2 + update DB.")
    parser.add_argument("--apply", action="store_true",
                        help="Vraiment upload et update DB (par défaut: dry-run preview).")
    parser.add_argument("--field", default="video_demo_url", choices=sorted(ALLOWED_FIELDS),
                        help="Champ DB à mettre à jour (défaut: video_demo_url).")
    parser.add_argument("--dir", default=str(LOCAL_VIDEOS_DIR),
                        help=f"Dossier source des vidéos (défaut: {LOCAL_VIDEOS_DIR}).")
    parser.add_argument("--concurrency", type=int, default=4)
    args = parser.parse_args()

    source_dir = Path(args.dir)
    if not source_dir.exists():
        print(f"ERROR: dossier source introuvable: {source_dir}", file=sys.stderr)
        print(f"       Crée-le et colle dedans les fichiers INF_<muscle>_<slug>.mp4")
        return 1

    print("=" * 70)
    print(f"Mode:        {'APPLY (real upload + DB update)' if args.apply else 'DRY-RUN preview'}")
    print(f"Source:      {source_dir}")
    print(f"DB field:    {args.field}")
    print("=" * 70)

    # Load Excel mapping
    mapping = load_excel_mapping()
    print(f"Excel mapping: {len(mapping)} fichiers attendus (selon Influenceur_100_Exercices_Recording.xlsx)")

    # Scan local dir
    local_files = {p.name: p for p in source_dir.glob("INF_*.mp4")}
    print(f"Local trouvés: {len(local_files)} fichiers dans {source_dir.name}/")

    # Match
    matched = []
    unknown = []
    for fname, path in local_files.items():
        info = mapping.get(fname)
        if info:
            matched.append((path, info))
        else:
            unknown.append(fname)

    missing = [fname for fname in mapping if fname not in local_files]

    print()
    print(f"✓ Matched (à uploader): {len(matched)}")
    print(f"? Inconnu (pas dans Excel): {len(unknown)}")
    print(f"  Manquant (Excel demande mais absent local): {len(missing)}")

    if unknown:
        print("\n  Fichiers inconnus:")
        for f in unknown[:5]:
            print(f"    - {f}")
        if len(unknown) > 5:
            print(f"    ... +{len(unknown) - 5}")

    if not matched:
        print("\nRien à faire.")
        return 0

    # Load R2 creds
    env = load_env()
    try:
        endpoint = env["BBF_R2_ENDPOINT"]
        access_key = env["BBF_R2_ACCESS_KEY_ID"]
        secret_key = env["BBF_R2_SECRET_ACCESS_KEY"]
        bucket = env["BBF_R2_BUCKET"]
        public_base = env.get("BBF_R2_PUBLIC_URL", "").rstrip("/")
    except KeyError as e:
        print(f"\nERROR: env var manquante: {e}", file=sys.stderr)
        return 1

    if not args.apply:
        print(f"\n=== DRY-RUN: les {len(matched)} fichiers SERAIENT uploadés ainsi ===")
        for path, info in matched[:10]:
            r2_key = f"influencer/{info['muscle']}/{info['slug']}.mp4"
            url = f"{public_base}/{r2_key}"
            print(f"  {path.name} → R2 [{r2_key}] → DB[{info['exercise_id']}].{args.field}={url}")
        if len(matched) > 10:
            print(f"  ... +{len(matched) - 10}")
        print(f"\n(Pour appliquer pour de vrai: ajoute --apply)")
        return 0

    # APPLY: upload + update DB
    s3 = boto3.client(
        "s3", endpoint_url=endpoint,
        aws_access_key_id=access_key, aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4", region_name="auto",
                      max_pool_connections=args.concurrency * 2),
    )

    def upload_one(item):
        path, info = item
        r2_key = f"influencer/{info['muscle']}/{info['slug']}.mp4"
        url = f"{public_base}/{r2_key}"
        ctype, _ = mimetypes.guess_type(str(path))
        try:
            s3.upload_file(
                str(path), bucket, r2_key,
                ExtraArgs={"ContentType": ctype or "video/mp4",
                           "CacheControl": "public, max-age=31536000"},
            )
            # Update DB
            sql = f"""UPDATE exercises
                      SET {args.field} = {esc(url)}
                      WHERE id = '{info['exercise_id']}'"""
            ok = db_exec(sql)
            return (path.name, ok, url if ok else "SQL update failed")
        except Exception as e:
            return (path.name, False, str(e))

    print(f"\nUpload de {len(matched)} fichiers vers R2 ({args.concurrency} parallèles)...")
    ok = 0
    failed = 0
    errors = []

    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = {executor.submit(upload_one, m): m for m in matched}
        for i, fut in enumerate(as_completed(futures), 1):
            fname, success, info = fut.result()
            if success:
                ok += 1
            else:
                failed += 1
                errors.append((fname, info))
            print(f"  [{i}/{len(matched)}] {'✓' if success else '✗'} {fname}")

    print(f"\n{'=' * 70}")
    print(f"DONE — uploadés: {ok}, échoués: {failed}")
    if errors:
        print("\nÉchecs:")
        for name, err in errors[:10]:
            print(f"  - {name}: {err}")
    print(f"{'=' * 70}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
