import json
import uuid

# Mapping muscle groups from seed data to DB enum values
MUSCLE_MAP = {
    'chest': 'Chest',
    'back': 'Back',
    'quads': 'Quadriceps',
    'quadriceps': 'Quadriceps',
    'hamstrings': 'Hamstrings',
    'glutes': 'Glutes',
    'calves': 'Calves',
    'shoulders': 'Shoulders',
    'biceps': 'Biceps',
    'triceps': 'Triceps',
    'core': 'Abs',
    'abs': 'Abs',
    'cardio': 'Cardio',
    'mobility': 'Mobility',
    'full_body': 'Bodyweight',
    'forearms': 'Biceps',
    'bodyweight': 'Bodyweight',
}

# Mapping equipment from seed data to DB Equipment flags (integer)
EQUIPMENT_MAP = {
    'barbell': 1,
    'dumbbell': 2,
    'cable': 4,
    'machine': 8,
    'bodyweight': 16,
    'trx': 32,
    'resistance_band': 64,
    'kettlebell': 128,
    'pull_up_bar': 256,
    'bench': 512,
    'squat_rack': 1024,
    'none': 0,
    'ez_bar': 1,
    'smith_machine': 8,
    'other': 0,
    'band': 64,
    'medicine_ball': 0,
    'foam_roller': 0,
    'stability_ball': 0,
    'plate': 1,
    'trap_bar': 1,
    'landmine': 1,
}

# Mapping difficulty
DIFFICULTY_MAP = {
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'advanced': 'Advanced',
    'expert': 'Expert',
}

def escape_sql(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

def to_jsonb(arr):
    if not arr:
        return "'[]'::jsonb"
    escaped = json.dumps(arr, ensure_ascii=False).replace("'", "''")
    return f"'{escaped}'::jsonb"

with open('/home/jirosak/big-boss-fitness/seed-data/bigboss-exercises.json', 'r') as f:
    exercises = json.load(f)

sql_lines = []
sql_lines.append("-- Big Boss Fitness - Seed 621 Exercices (adapte au schema)")
sql_lines.append("-- Genere automatiquement\n")

for ex in exercises:
    muscle = MUSCLE_MAP.get(ex.get('muscle_group', ''), 'Bodyweight')
    equip = EQUIPMENT_MAP.get(ex.get('equipment', 'none'), 0)
    diff = DIFFICULTY_MAP.get(ex.get('difficulty', 'beginner'), 'Beginner')

    name_fr = ex.get('titre_fr', ex.get('title_en', ''))
    name_darija = ex.get('titre_darija', None)
    if name_darija == '...':
        name_darija = None
    name_en = ex.get('title_en', '')
    description_fr = ex.get('description_fr', None)

    ymove_id = ex.get('ymove_id', '')
    ymove_slug = ex.get('ymove_slug', '')
    has_video = 'true' if ex.get('has_video', False) else 'false'

    instructions_en = ex.get('instructions_en', [])
    instructions_fr = ex.get('instructions_fr', [])
    tips_en = ex.get('tips_en', [])
    tips_coach_fr = ex.get('tips_coach_fr', [])
    erreurs_courantes_fr = ex.get('erreurs_courantes_fr', [])

    # Generate search tags
    tags = [ex.get('muscle_group', ''), ex.get('equipment', ''), name_en.lower()]

    # Build INSERT
    sql = f"""INSERT INTO exercises (
  id, ymove_id, ymove_slug, has_video,
  name_fr, name_darija, name_en, description_fr,
  primary_muscle, category, secondary_muscles, difficulty, required_equipment,
  instructions_en, instructions_fr, tips_en, tips_coach_fr, erreurs_courantes_fr,
  coaching_cues, common_mistakes,
  alternative_exercise_ids, contraindications, risk_factors, search_tags,
  min_reps_hypertrophy, max_reps_hypertrophy, min_reps_strength, max_reps_strength,
  min_reps_endurance, max_reps_endurance, complexity_score, is_active
) VALUES (
  gen_random_uuid(), {escape_sql(ymove_id)}, {escape_sql(ymove_slug)}, {has_video},
  {escape_sql(name_fr)}, {escape_sql(name_darija)}, {escape_sql(name_en)}, {escape_sql(description_fr)},
  {escape_sql(muscle)}, {escape_sql(muscle)}, '[]'::jsonb, {escape_sql(diff)}, {equip},
  {to_jsonb(instructions_en)}, {to_jsonb(instructions_fr)}, {to_jsonb(tips_en)}, {to_jsonb(tips_coach_fr)}, {to_jsonb(erreurs_courantes_fr)},
  {to_jsonb(tips_coach_fr)}, {to_jsonb(erreurs_courantes_fr)},
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, {to_jsonb(tags)},
  8, 12, 3, 5, 15, 25, 5, true
)
ON CONFLICT (ymove_id) DO UPDATE SET
  name_fr = EXCLUDED.name_fr,
  name_en = EXCLUDED.name_en,
  name_darija = EXCLUDED.name_darija,
  description_fr = EXCLUDED.description_fr,
  instructions_en = EXCLUDED.instructions_en,
  instructions_fr = EXCLUDED.instructions_fr,
  tips_en = EXCLUDED.tips_en,
  tips_coach_fr = EXCLUDED.tips_coach_fr,
  erreurs_courantes_fr = EXCLUDED.erreurs_courantes_fr,
  coaching_cues = EXCLUDED.coaching_cues,
  common_mistakes = EXCLUDED.common_mistakes,
  updated_at = CURRENT_TIMESTAMP;"""

    sql_lines.append(sql)

output = '\n\n'.join(sql_lines)

with open('/home/jirosak/big-boss-fitness/seed-data/seed-adapted.sql', 'w') as f:
    f.write(output)

print(f"Generated {len(exercises)} INSERT statements")
print(f"Output: seed-adapted.sql")
