# Programme Personnalisé V2 — Plan d'Implémentation

## Problèmes du Système Actuel

| # | Problème | Impact |
|---|----------|--------|
| 1 | Programme **pas généré automatiquement** après onboarding | L'utilisateur arrive sur une page vide |
| 2 | **Aucune IA** dans la génération | Sélection d'exercices aléatoire |
| 3 | **Données onboarding ignorées** | 80% des données collectées ne servent à RIEN dans le programme |
| 4 | **Plan nutritionnel basique** | Recettes au hasard, pas de distribution calorique |
| 5 | **Pas de warm-up / cool-down** | Sessions sans échauffement |
| 6 | **Progressive overload simpliste** | +1 set tous les 4 semaines seulement |
| 7 | **Pas de coaching** | Zéro message motivant, zéro conseil personnalisé |

---

## MAPPING COMPLET : Donnée Onboarding → Impact sur le Programme

C'est le coeur du système V2. **Chaque donnée de l'onboarding influence le programme.**

### Données Physiques

| Donnée Onboarding | Utilisation Actuelle | Utilisation V2 |
|---|---|---|
| **WeightKg** (80kg) | Calcul BMR/TDEE seulement | + Suggestion poids de départ par exercice (% du poids corporel), + Estimation 1RM, + Adaptation charge progressive |
| **HeightCm** (175cm) | Calcul BMR seulement | + Choix d'exercices adaptés (grand gabarit → sumo deadlift recommandé vs conventional), + ROM notes |
| **Gender** (male/female) | Calcul BMR seulement | + Ratios volume haut/bas du corps (femme → +legs, homme → +upper), + Poids suggérés réalistes par genre |
| **Age** (via BirthDate) | Calcul BMR seulement | + Durée warm-up (+5min si >40 ans), + Repos plus long si >40 ans (+15s), + Intensité plafonnée si >50 ans, + Exercices à éviter (jump squats si >45 ans) |
| **BodyFatPercent** (25%) | Rien | + Si >25% → programme Cut même si goal = Mass (pré-phase), + Ajustement macros (plus protéines si BF élevé), + Cardio intégré si >30% |
| **WaistCm** | Rien | + Tracking progress (comparer chaque mois) |

### Objectif & Niveau

| Donnée | Utilisation Actuelle | Utilisation V2 |
|---|---|---|
| **Goal** (BuildMuscle) | Split + durée + sets/reps basiques | + **Schéma de periodisation complet** (voir ci-dessous), + Techniques spéciales par goal, + Type de cardio adapté, + Distribution macros spécifique |
| **Level** (Beginner) | ±1 set seulement | + **Sélection exercices par complexité** (débutant → machines/guidés, avancé → barbell/libre), + Volume total adapté (débutant = 12 sets/semaine/muscle, avancé = 20), + Techniques avancées SEULEMENT pour Advanced/Expert, + Tempo adapté (débutant = lent pour apprendre), + Plus de notes coaching pour débutants |
| **EnergyLevel** | Rien (session ad-hoc) | + Semaine 1 volume réduit si énergie ≤ 4, + Message "écoute ton corps" si énergie ≤ 3 |

### Training Preferences

| Donnée | Utilisation Actuelle | Utilisation V2 |
|---|---|---|
| **TrainingFrequency** (4×/sem) | Split seulement | + **Split optimisé** (pas juste Full Body/PPL), + Répartition volume hebdomadaire, + Jours de repos stratégiquement placés |
| **PreferredDuration** (60min) | Stocké mais ignoré | + **Nombre d'exercices calibré** (45min→4-5 exos, 60min→5-7, 90min→7-9), + Temps de repos adapté (session courte → repos courts), + Supersets si temps limité |
| **PreferredDays** (Lun,Mar,Jeu,Ven) | Jours de session | + Placement intelligent (pas 2 jours legs consécutifs), + Jours repos entre sessions intenses |
| **PreferredTime** (morning) | Rien | + **Warm-up plus long si matin** (+3min, corps froid), + Meal timing adapté (matin → collation pré-workout, soir → repas complet 2h avant), + Conseil caféine si matin |
| **AvailableEquipment** (Gym) | Filtre basique | + **Priorisation exercices optimaux** (barbell > dumbbell > machine > bodyweight si gym complet), + Alternatives par équipement, + Si home seulement → supersets/circuits pour compenser |

### Santé & Blessures

| Donnée | Utilisation Actuelle | Utilisation V2 |
|---|---|---|
| **Injuries** (["genou"]) | Exclure muscle blessé entier | + **Exclusion intelligente** (genou → pas de squat profond MAIS leg press OK, pas de jump MAIS extensions OK), + Exercices de réhab intégrés (renforcement autour de la blessure), + Notes de précaution par exercice ("attention à ne pas verrouiller le genou") |
| **MedicalConditions** (["hypertension"]) | Rien | + Hypertension → éviter Valsalva, repos plus longs, pas de max effort, + Diabète → meal timing strict, collation pré-workout obligatoire, + Asthme → pas de HIIT intense, préférer steady state |
| **FoodAllergies** (["gluten"]) | Filtre recettes basique | + Filtre strict ingrédients, + Alternatives suggérées (avoine sans gluten au lieu de blé), + Label visible "Sans gluten" sur chaque repas |

### Nutrition & Diet

| Donnée | Utilisation Actuelle | Utilisation V2 |
|---|---|---|
| **DietType** (omnivore) | Filtre végétarien/vegan | + **Répartition protéines adaptée** (vegan → plus de sources variées, compléments conseillés), + Vegan → note B12/créatine, + Pescatarian → priorité poisson post-workout |
| **MealsPerDay** (4) | Rien | + **Distribution calorique sur 3/4/5/6 repas**, + Si 3 repas → portions plus grandes, + Si 5-6 → mini-meals, snacking structuré |
| **PreferredCuisines** (["marocaine","méditerranéenne"]) | Rien | + **Scoring recettes avec bonus cuisine préférée**, + Au moins 50% des recettes de cuisines préférées, + Introduction progressive d'autres cuisines (20%) |
| **IsRamadanMode** | Filtre ramadan-friendly | + **Restructuration complète** : 2 repas (Iftar + Suhoor), + Training après Iftar ou avant Suhoor, + Hydratation massive pendant la nuit, + Pas de HIIT pendant le jeûne, + Volume réduit -20% |

### Lifestyle

| Donnée | Utilisation Actuelle | Utilisation V2 |
|---|---|---|
| **ActivityLevel** (moderate) | TDEE multiplier seulement | + Sédentaire → ajouter 10min cardio à chaque session, + Très actif → réduire volume (déjà fatigué), + Conseils NEAT (marche quotidienne) |
| **SleepHours** (6h) | Rien | + Si <7h → **volume réduit -15%** (récupération insuffisante), + Repos entre sets +15s, + Pas de sessions le soir (affecte le sommeil), + Conseil prioritaire "Dors plus!", + Deload plus fréquent (toutes les 3 semaines au lieu de 4) |
| **StressLevel** (8/10) | Rien | + Si ≥7 → **volume réduit -10%** (cortisol élevé = mauvaise récup), + Pas de techniques d'intensification (drop sets, etc.), + Exercices de respiration dans warm-up, + Yoga/stretching dans cool-down, + Message "Le gym c'est ton anti-stress, pas un stress de plus" |

### Targets & Motivation

| Donnée | Utilisation Actuelle | Utilisation V2 |
|---|---|---|
| **TargetWeightKg** (75kg, actuellement 85kg) | Rien | + **Calcul durée réaliste** (-10kg → ~20 semaines à -0.5kg/sem), + Objectif hebdo affiché (-0.5kg/sem), + Alerte si objectif irréaliste, + Déficit calorique calculé précisément |
| **TargetDate** | Rien | + Adapter le déficit/surplus au timing, + Si date trop agressive → avertissement |
| **MotivationReasons** (["confiance","santé"]) | Rien | + **Messages personnalisés** ("Chaque séance te rapproche de la confiance que tu mérites"), + Tips orientés vers la motivation principale |
| **PreviousBlockers** (["manque de temps"]) | Rien | + "Manque de temps" → sessions optimisées (supersets, circuits), + "Motivation" → système de streak + points plus visible, + "Blessure" → programme extra-safe avec progression très lente |
| **CoachTonePreference** (motivant) | Rien | + Motivant → messages avec "يالاه الوحش! 💪🔥", + Technique → messages focus data "Tu es à 73% de ton objectif", + Strict → "Pas d'excuses. C'est la discipline qui fait les champions." |

---

## ALGORITHME DE PERSONNALISATION V2

### Étape 1 : Volume Hebdomadaire par Muscle (basé sur la science)

Le volume optimal dépend du **niveau** et du **goal** :

```
SETS PAR SEMAINE PAR MUSCLE:

              Beginner  Intermediate  Advanced  Expert
Force         8-10      12-14         16-18     18-20
Masse         10-12     14-16         18-20     20-22
Sèche         8-10      10-12         12-14     14-16
Endurance     6-8       8-10          10-12     12-14

AJUSTEMENTS:
- SleepHours < 7    → -15% volume
- StressLevel >= 7  → -10% volume  
- Age > 40          → -10% volume
- EnergyLevel <= 4  → -20% volume (semaine 1 seulement)
```

### Étape 2 : Répartition des Muscles selon le Goal + Genre

```
HOMME - BuildMuscle:
  Priorité: Chest (20%), Back (20%), Legs (25%), Shoulders (15%), Arms (15%), Abs (5%)

FEMME - BuildMuscle:
  Priorité: Glutes (25%), Legs (25%), Back (15%), Shoulders (15%), Arms (10%), Abs (10%)

HOMME - LoseFat:
  Priorité: Legs (25%), Back (20%), Chest (20%), Shoulders (15%), Arms (10%), Abs (10%)

FEMME - LoseFat:
  Priorité: Glutes (30%), Legs (25%), Back (15%), Shoulders (10%), Arms (10%), Abs (10%)

TOUT - Recomposition:
  Distribution équilibrée avec léger focus sur points faibles
```

### Étape 3 : Sélection d'Exercices Intelligente

**Priorité de sélection (score composite) :**

```
ExerciseScore = 
    BaseScore (compound=10, isolation=5)
  + EquipmentMatch (optimal=5, acceptable=3, suboptimal=1)  
  + LevelMatch (exact=5, one_below=3, two_below=1, above=0)
  + InjurySafe (safe=5, caution=2, avoid=0)
  + VarietyBonus (not_used_last_2_weeks=3, not_used_last_week=1)

RÈGLES:
1. Chaque session COMMENCE par 1-2 exercices composés (squat, bench, deadlift, row)
2. Puis isolation pour compléter le volume
3. Débutant: 70% machines/guidés, 30% libres
4. Intermédiaire: 50/50
5. Avancé: 70% libres, 30% machines
6. Expert: 80% libres, 20% machines (isolation ciblée)
```

### Étape 4 : Poids de Départ Suggéré

```
ESTIMATION BASÉE SUR LE POIDS CORPOREL:

Squat:
  Beginner: 0.5× BW    (80kg → 40kg)
  Intermediate: 0.8× BW (80kg → 65kg)
  Advanced: 1.2× BW     (80kg → 95kg)

Bench Press:
  Beginner: 0.3× BW     (80kg → 25kg)
  Intermediate: 0.6× BW (80kg → 50kg)
  Advanced: 1.0× BW     (80kg → 80kg)

Deadlift:
  Beginner: 0.6× BW     (80kg → 50kg)
  Intermediate: 1.0× BW (80kg → 80kg)
  Advanced: 1.5× BW     (80kg → 120kg)

Overhead Press:
  Beginner: 0.2× BW     (80kg → 15kg)
  Intermediate: 0.4× BW (80kg → 30kg)
  Advanced: 0.7× BW     (80kg → 55kg)

Row:
  Beginner: 0.3× BW     (80kg → 25kg)
  Intermediate: 0.6× BW (80kg → 50kg)
  Advanced: 0.9× BW     (80kg → 70kg)

Autres exercices:
  Machine/Isolation: calculé proportionnellement
  
AJUSTEMENT GENRE:
  Femme upper body: × 0.6
  Femme lower body: × 0.85
```

### Étape 5 : Periodisation par Goal

**BuildMuscle (12 semaines) :**
```
Phase 1 - Adaptation (S1-3):    3×10-12, tempo 3-1-2, repos 90s
Phase 2 - Hypertrophie (S4-7):  4×8-12, tempo 2-1-1, repos 75s, +5-10% poids
Phase 3 - Intensif (S8-10):     4×6-10, supersets, rest-pause, repos 60-90s
Phase 4 - Peak (S11):           5×6-8, drop sets, techniques avancées
Phase 5 - Deload (S12):         2×12-15, -30% poids, focus forme
```

**LoseFat (8 semaines) :**
```
Phase 1 - Adaptation (S1-2):    3×12-15, tempo 2-1-1, repos 60s
Phase 2 - Métabolique (S3-5):   3-4×12-15, supersets obligatoires, repos 45s, circuit finisher
Phase 3 - HIIT (S6-7):          3-4×10-15, tri-sets, tabata finisher 4min
Phase 4 - Deload (S8):          2×15, -30% poids, cardio léger
```

**BuildStrength (12 semaines) :**
```
Phase 1 - Adaptation (S1-3):    4×8, tempo 2-1-2, repos 120s
Phase 2 - Force (S4-7):         5×5, repos 180s, +5% poids chaque semaine
Phase 3 - Peak (S8-10):         5×3, repos 240s, attempts PR
Phase 4 - Taper (S11):          3×5, -15% poids
Phase 5 - Test (S12):           Deload + test 1RM
```

**Endurance (8 semaines) :**
```
Phase 1 - Base (S1-2):          2×20, repos 30s
Phase 2 - Build (S3-5):         3×15-20, circuits, repos 30s, EMOM
Phase 3 - Peak (S6-7):          3-4×15-25, AMRAP, minimal rest
Phase 4 - Deload (S8):          2×20, repos 45s
```

### Étape 6 : Gestion des Blessures (mapping détaillé)

```
BLESSURE "genou" / "knee":
  INTERDIT: Jump squat, Box jump, Lunge profond, Sissy squat, Squat ATG
  AUTORISÉ AVEC PRÉCAUTION: Squat parallèle, Leg press (amplitude limitée), Step-up bas
  RECOMMANDÉ: Leg extension (léger), Leg curl, Hip thrust, Calf raise
  RÉHAB: Terminal knee extension, Wall sit isometric, Quad stretch
  NOTE SESSION: "Attention au genou: ne descends pas en dessous du parallèle, arrête si douleur"

BLESSURE "épaule" / "shoulder":  
  INTERDIT: Behind-neck press, Upright row, Dips profonds, Pullover lourd
  AUTORISÉ AVEC PRÉCAUTION: Overhead press (neutre grip), Lateral raise (pouce en haut)
  RECOMMANDÉ: Cable face pull, Band external rotation, Landmine press
  RÉHAB: Band pull-aparts, External rotation, Scapular push-ups
  NOTE SESSION: "Épaule sensible: favorise le grip neutre, évite l'amplitude maximale au-dessus de la tête"

BLESSURE "dos" / "back":
  INTERDIT: Deadlift conventionnel lourd, Good morning, Hyperextension lourd
  AUTORISÉ AVEC PRÉCAUTION: Deadlift roumain léger, Row avec support poitrine
  RECOMMANDÉ: Lat pulldown, Cable row assis, Face pull
  RÉHAB: Bird dog, Dead bug, Cat-cow, McGill curl-up
  NOTE SESSION: "Dos sensible: garde TOUJOURS le dos neutre, pas de flexion lombaire sous charge"

BLESSURE "poignet" / "wrist":
  INTERDIT: Curl barre droite, Front squat grip, Push-up sur paumes
  RECOMMANDÉ: Curl haltères neutre (hammer), EZ bar curl, Push-up sur poings/poignées
  RÉHAB: Wrist curls légers, Extenseur élastique

BLESSURE "hanche" / "hip":
  INTERDIT: Sumo squat large, Butterfly stretch dynamique
  RECOMMANDÉ: Goblet squat étroit, Hip thrust, Romanian deadlift
  RÉHAB: Clam shell, Fire hydrant, Hip flexor stretch

CONDITION "hypertension":
  ADAPTATION: Repos +30s entre sets, jamais de Valsalva (expirer sur l'effort), pas de charges >85% 1RM
  NOTE: "Respire continuellement. Expire sur l'effort, inspire sur la phase négative."

CONDITION "diabete":
  ADAPTATION: Collation pré-workout obligatoire (15-30g glucides), tester glycémie avant
  NOTE: "Garde toujours une source de sucre rapide à portée pendant l'entraînement."

CONDITION "asthme":
  ADAPTATION: Warm-up progressif (+5min), pas de HIIT intense, préférer intervals modérés
  NOTE: "Garde ton inhalateur accessible. Si essoufflement excessif, réduis l'intensité."
```

### Étape 7 : Estimation Durée de Session

```
CALCUL PRÉCIS:
  warmup_min = 5 + (age > 40 ? 3 : 0) + (preferredTime == "morning" ? 2 : 0)
  exercise_time = sum(sets × (rep_time + rest_seconds)) pour chaque exercice
    où rep_time = reps × tempo_total_seconds (ex: 3+1+2+0 = 6s × 10 reps = 60s)
  cooldown_min = 5
  total = warmup_min + exercise_time + cooldown_min

AJUSTEMENT AU PREFERRED DURATION:
  Si total > preferredDuration + 5min → retirer 1 exercice d'isolation
  Si total > preferredDuration + 10min → retirer 1 exercice d'isolation + réduire repos -15s
  Si total < preferredDuration - 10min → ajouter 1 exercice ou +1 set
```

---

## NUTRITION V2 — 100% Personnalisée

### Distribution Calorique Intelligente

```
3 REPAS/JOUR:
  Petit-déj: 30%  |  Déjeuner: 40%  |  Dîner: 30%

4 REPAS/JOUR:
  Petit-déj: 25%  |  Déjeuner: 35%  |  Snack: 10%  |  Dîner: 30%

5 REPAS/JOUR:
  Petit-déj: 20%  |  Snack1: 10%  |  Déjeuner: 30%  |  Snack2: 10%  |  Dîner: 30%

TRAINING DAY vs REST DAY:
  Training: calories +100, carbs +20%, fat -10%
  Rest:     calories -100, carbs -20%, fat +10%
  Protein:  identique (récupération)

RAMADAN MODE:
  Suhoor (40%): glucides complexes + protéines + eau+++
  Iftar (45%): protéines + glucides rapides puis complexes
  Collation nocturne (15%): caséine/fromage blanc + fruits secs
```

### Scoring Recettes

```
RecipeScore(recipe, mealSlot, targetCalories, targetProtein, user) =
    0.35 × CalorieMatch     // |recipe.cal - targetCal| / targetCal, inversé
  + 0.25 × ProteinMatch     // idem pour protéines
  + 0.15 × CuisineBonus     // 1.0 si cuisine préférée, 0.5 sinon
  + 0.10 × VarietyBonus     // 1.0 si pas encore utilisé cette semaine
  + 0.10 × GoalMatch        // IsCutting si goal=cut, IsBulking si goal=mass
  + 0.05 × RamadanMatch     // 1.0 si IsRamadanFriendly et mode Ramadan

CONTRAINTES DURES:
  - DietType respecté (vegan/vegetarian/pescatarian)
  - Allergies exclues (scan IngredientsJson)
  - Même recette max 2×/semaine
  - Jamais 2 jours consécutifs identiques
  - Min 3 cuisines différentes/semaine
```

### Meal Timing personnalisé selon PreferredTime

```
TRAINING MATIN (6h-10h):
  - Petit-déj léger 1h avant (banane + café)
  - Post-workout shake/repas dans les 30min
  - Déjeuner riche en protéines
  - Dîner modéré

TRAINING MIDI (11h-14h):
  - Petit-déj complet 3h avant
  - Post-workout = déjeuner (protéines + glucides)
  - Snack après-midi
  - Dîner léger

TRAINING SOIR (17h-21h):
  - Petit-déj normal
  - Déjeuner riche en glucides (fuel pour le soir)
  - Snack pré-workout 1-2h avant
  - Dîner post-workout (protéines + glucides modérés)
```

---

## WARM-UP PERSONNALISÉ

```
BASE (tout le monde): 5 minutes
  + Age > 40: +3 minutes
  + PreferredTime == "morning": +2 minutes (corps froid)
  + Injury presente: +3 minutes (mobilité ciblée)
  + Level == Beginner: exercices plus simples

WARM-UP PAR MUSCLES (Push day, user 25 ans, soir, pas de blessure):
  1. Jumping jacks (60s) - activation cardio
  2. Arm circles (30s chaque sens)
  3. Band pull-aparts (15 reps)  
  4. Light push-ups (10 reps, tempo lent)
  5. Shoulder dislocates avec bâton (10 reps)

WARM-UP PAR MUSCLES (Leg day, user 45 ans, matin, blessure genou):
  1. Marche sur place (2 min) - activation progressive
  2. Hip circles (30s chaque sens)
  3. Bodyweight squats partiels (10 reps, pas profond)
  4. Leg swings avant/arrière (10 chaque jambe)
  5. Terminal knee extensions band (15 reps) - réhab
  6. Glute bridges (10 reps)
  7. Cat-cow stretches (10 reps)
  8. Ankle rotations (30s) - mobilité
```

---

## COOL-DOWN PERSONNALISÉ

```
BASE: 5 minutes
  + StressLevel >= 7: +3 minutes (respiration + relaxation)
  + SleepHours < 7: ajout exercices relaxants

COOL-DOWN (Post Push, stress normal):
  1. Étirement pectoral au mur (30s/côté)
  2. Overhead triceps stretch (30s/bras)
  3. Cross-body shoulder stretch (30s/bras)
  4. Child's pose (45s)

COOL-DOWN (Post Legs, stress élevé):
  1. Standing quad stretch (30s/jambe)
  2. Standing hamstring stretch (30s/jambe)
  3. Pigeon stretch (45s/côté)
  4. Glute stretch assis (30s/côté)
  5. Respiration profonde 4-7-8 (5 cycles)
  6. Body scan relaxation (2 min)
```

---

## MESSAGES MOTIVANTS — Personnalisés selon CoachTonePreference

### Tone "motivant" (défaut Big Boss style)

```
S1: "يالاه الوحش! Première semaine, on pose les fondations. Chaque rep compte, même les légères!"
S4: "Un mois déjà! Tu vois la différence? Moi je la vois. On lâche rien! 💪"
S8: "La moitié du chemin! Tu es plus fort que quand tu as commencé. La preuve est dans tes perfs."
S12: "DERNIER ROUND! Tu as survécu 11 semaines. Cette dernière, c'est la victoire lap. الوحش! 🔥"

Deload: "Semaine récup — c'est pas de la faiblesse, c'est de la STRATÉGIE. Les pros font ça. Toi aussi."
```

### Tone "technique" (data-driven)

```
S1: "Semaine 1/12. Objectif: maîtriser la forme. Volume: {totalSets} sets. Focus: tempo et ROM complet."
S4: "Semaine 4. Progression attendue: +5-10% sur tes charges composées. Track tout."
S8: "Mi-parcours. Adhérence: {adherence}%. Volume cumulé: {totalVolume} sets. On continue."
S12: "Semaine finale. Volume réduit -30%. Prépare-toi pour le test de progression."

Deload: "Deload programmé. Volume -30%, intensité -20%. Objectif: supercompensation pour la phase suivante."
```

### Tone "strict" (drill sergeant)

```
S1: "C'est parti. Pas d'excuses. Tu as signé pour 12 semaines. Sois là chaque jour prévu."
S4: "Un mois. Tu tiens? Bien. Maintenant c'est là que ça commence vraiment."
S8: "La moitié. Ceux qui abandonnent le font maintenant. Pas toi."
S12: "Dernière semaine. Tu as prouvé que tu peux. Maintenant prouve que tu ne t'arrêteras JAMAIS."

Deload: "Repos stratégique. Pas une excuse pour dormir. Étirements, mobilité, nutrition on point."
```

---

## LIFESTYLE PERSONNALISÉ

### Conseils Sommeil (basé sur SleepHours)

```
SleepHours >= 8: "Excellent! Tu dors assez pour une récupération optimale."
SleepHours 7: "Correct, mais 8h serait idéal. Essaie de gagner 30min."
SleepHours 6: "⚠️ 6h c'est insuffisant. Tu perds ~30% de récupération. Volume réduit de 15% pour compenser."
SleepHours <= 5: "🚨 CRITIQUE. Moins de 6h = cortisol élevé + fonte musculaire. Priorité #1: dormir plus."

Routine personnalisée:
  Si PreferredTime == "soir" et SleepHours < 7:
    "Attention: l'entraînement tardif peut affecter ton sommeil. Finis au moins 2h avant le coucher."
```

### Conseils Stress (basé sur StressLevel)

```
StressLevel 1-3: Aucun ajustement
StressLevel 4-6: "Utilise l'entraînement comme anti-stress. 5 respirations profondes avant chaque session."
StressLevel 7-8: Volume -10%, pas de techniques d'intensification, cool-down +3min relaxation
StressLevel 9-10: Volume -20%, sessions plus courtes, yoga/marche recommandés les jours off
```

### Hydratation (basé sur WeightKg + ActivityLevel)

```
Base: WeightKg × 0.033 litres (80kg → 2.6L)
  + ActivityLevel "active"/"extreme": +500ml
  + Training days: +500ml
  + Ramadan: concentrer toute l'hydratation entre Iftar et Suhoor

Exemple (80kg, actif): "Bois minimum 3.1L par jour. 3.6L les jours d'entraînement."
```

---

## RÉSUMÉ TECHNIQUE

### Nouvelles Colonnes DB

**Programme:**
```
WelcomeMessage, ProgrammeGoalSummary,
MealPlanWeeksJson (4 semaines au lieu de 1), MealTimingJson,
TrainingDayCalories, RestDayCalories,
SleepAdviceJson, StressAdviceJson, HydrationAdvice,
WeeklyScheduleJson (enrichi avec phases, deload, motivation, tips, rest days)
```

**ProgrammeSession:**
```
WarmupJson, CooldownJson, SessionNote, Phase
```

**ExercisesJson enrichi:**
```
+ tempo, coachNote, commonMistake, videoUrl, thumbnailUrl,
  alternativeIds, technique, isCompound, primaryMuscle, order,
  suggestedWeightKg
```

### Fichiers à Modifier

| Fichier | Changement |
|---------|-----------|
| `ProgrammeService.cs` | Refactoring complet — personnalisation 100% |
| `Programme.cs` | Nouvelles propriétés |
| `ProgrammeSession.cs` | WarmupJson, CooldownJson, SessionNote |
| `UserService.cs` | Auto-generate après onboarding |
| Migration EF | Nouvelles colonnes |
| Mobile `programme/` screens | Afficher les nouvelles données |
| Mobile `onboarding.tsx` | Loading réel + redirect avec programme |
