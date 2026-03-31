#!/usr/bin/env python3
"""
Big Boss Fitness - Translate 386 recipes to Darija using GPT-4o-mini
"""

import json
import urllib.request
import subprocess
import time
import sys

API_KEY = "REDACTED_OPENAI_KEY"

SYSTEM_MSG = "Moroccan home cook. 100% Darija. JSON only. No markdown. NEVER substitute ingredients."

def build_prompt(title, description, ingredients, steps, cuisine):
    ing_count = len(ingredients)
    step_count = len(steps)
    return f"""You are a Moroccan home cook explaining a recipe to a friend. Write in 100% NATURAL Moroccan Darija.

=== DATA INTEGRITY (HIGHEST PRIORITY) ===
- NEVER replace an ingredient with a different food
- Each Darija ingredient = SAME food as original
- Count: {ing_count} ingredients, {step_count} steps

=== EXOTIC INGREDIENT HANDLER ===
If uncommon in Morocco: keep name in Arabic script + add short Darija explanation in ()

=== 100% DARIJA STYLE ===
MANDATORY:
- فالمقلة / فالفرن (NOT في المقلة)
- خليه / خليها / زيد / حط / نثر / دير
- خلط (mix) / دير (do/make) / فرش (spread)
- خليه يتقلا / تذبل / يتشحر / يعقاد
- غير شوية / حتى يولي ذهبي / حتى تبان الريحة
- معلقة (ALWAYS) / كاس / كيسان / نص / ربع
AVOID: مزج / فرد / تقديم / نضيف / نغلي / رش / نقلها / ملعقة / في+noun / تطهى / يغلو
NO French, NO English, NO MSA

=== INGREDIENT MAPPING ===
garlic→ثوم | ginger→زنجبيل | turmeric→خرقوم | cilantro→قزبور | lemon→حامض | tomato→مطيشة | onion→بصلة | okra→باميا | tofu→توفو

=== ORIGIN ===
Cuisine: {cuisine} → mention origin if NOT Moroccan

RECIPE ({ing_count} ingredients, {step_count} steps):
Title: {title}
Description: {description}
Ingredients: {json.dumps(ingredients)}
Steps: {json.dumps(steps)}

STRICT JSON:
{{
  "title": "natural Darija + origin",
  "title_fr": "French title",
  "description": "1-2 warm Darija sentences",
  "ingredients": ["EXACTLY {ing_count} items"],
  "steps": ["EXACTLY {step_count} items"]
}}"""


def call_gpt(prompt, retries=3):
    for attempt in range(retries):
        try:
            body = json.dumps({
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": SYSTEM_MSG},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.5,
                "max_tokens": 2000
            }).encode()
            req = urllib.request.Request("https://api.openai.com/v1/chat/completions",
                data=body, headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"})
            resp = urllib.request.urlopen(req, timeout=45)
            data = json.loads(resp.read())
            content = data["choices"][0]["message"]["content"]
            if content.startswith("```"):
                content = "\n".join(content.split("\n")[1:])
                if content.endswith("```"): content = content[:-3]
                content = content.strip()
            return json.loads(content)
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
            else:
                raise e


def db_query(sql):
    result = subprocess.run(
        ["docker", "exec", "-i", "bigboss-postgres", "psql", "-U", "bigboss", "-d", "bigbossfitness", "-t", "-A", "-c", sql],
        capture_output=True, text=True
    )
    return result.stdout.strip()


def db_exec(sql):
    proc = subprocess.run(
        ["docker", "exec", "-i", "bigboss-postgres", "psql", "-U", "bigboss", "-d", "bigbossfitness", "-c", sql],
        capture_output=True, text=True
    )
    return "UPDATE 1" in proc.stdout or "INSERT" in proc.stdout


def esc(s):
    if s is None: return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


# Get all recipes without Darija
rows = db_query("""
SELECT "Id", "Title", "Description", "IngredientsJson", "StepsJson", "CuisineType"
FROM "Recipes"
WHERE "TitleDarija" IS NULL
ORDER BY "Title"
""")

recipes = []
for line in rows.split("\n"):
    if not line.strip(): continue
    parts = line.split("|")
    if len(parts) >= 6:
        recipes.append({
            "id": parts[0],
            "title": parts[1],
            "description": parts[2],
            "ingredients_json": parts[3],
            "steps_json": parts[4],
            "cuisine": parts[5]
        })

print(f"{'=' * 60}")
print(f"Translating {len(recipes)} recipes to Darija")
print(f"{'=' * 60}")

success = 0
failed = 0
failed_list = []

for i, r in enumerate(recipes):
    try:
        ingredients = json.loads(r["ingredients_json"])
        steps = json.loads(r["steps_json"])
    except:
        failed += 1
        failed_list.append(r["title"])
        continue

    sys.stdout.write(f"\r[{i+1}/{len(recipes)}] {r['title'][:50]}...")
    sys.stdout.flush()

    try:
        prompt = build_prompt(r["title"], r["description"], ingredients, steps, r["cuisine"])
        result = call_gpt(prompt)

        # Validate counts
        if len(result.get("ingredients", [])) != len(ingredients):
            print(f" ⚠️ ing mismatch ({len(ingredients)} vs {len(result.get('ingredients',[]))})")
        if len(result.get("steps", [])) != len(steps):
            print(f" ⚠️ step mismatch ({len(steps)} vs {len(result.get('steps',[]))})")

        title_fr = result.get("title_fr", r["title"])
        title_darija = result.get("title", "")
        desc_darija = result.get("description", "")
        ing_darija = json.dumps(result.get("ingredients", []), ensure_ascii=False)
        steps_darija = json.dumps(result.get("steps", []), ensure_ascii=False)

        sql = f"""UPDATE "Recipes" SET
            "TitleFr" = {esc(title_fr)},
            "TitleDarija" = {esc(title_darija)},
            "DescriptionDarija" = {esc(desc_darija)},
            "IngredientsDarijaJson" = {esc(ing_darija)},
            "StepsDarijaJson" = {esc(steps_darija)}
            WHERE "Id" = '{r["id"]}'"""

        if db_exec(sql):
            success += 1
        else:
            failed += 1
            failed_list.append(r["title"])

    except Exception as e:
        failed += 1
        failed_list.append(f"{r['title']}: {str(e)[:50]}")
        print(f" ❌ {e}")

    # Rate limit: ~3 requests per second
    time.sleep(0.4)

print(f"\n{'=' * 60}")
print(f"DONE!")
print(f"  Success: {success}/{len(recipes)}")
print(f"  Failed:  {failed}")
if failed_list:
    print(f"\nFailed recipes:")
    for f in failed_list:
        print(f"  - {f}")
print(f"{'=' * 60}")
