# Big Boss Fitness - Programme Personnalise
## Plan d'implementation

---

## 1. CONCEPT

Apres l'onboarding, le systeme genere automatiquement un **programme complet** (exercices + nutrition) adapte au profil de l'utilisateur. Ce programme apparait sur le dashboard comme element principal.

L'utilisateur a 2 choix:
1. **Suivre le programme personnalise** (recommande)
2. **Creer ses propres seances** (mode libre)

---

## 2. STRUCTURE DU PROGRAMME

### Programme = Plan de X semaines

```
Programme "Prise de Masse - 12 semaines"
├── Semaine 1
│   ├── Lundi: Seance Push (Pectoraux + Epaules + Triceps)
│   ├── Mardi: Repos
│   ├── Mercredi: Seance Pull (Dos + Biceps)
│   ├── Jeudi: Repos
│   ├── Vendredi: Seance Legs (Jambes + Fessiers)
│   ├── Samedi: Repos
│   └── Dimanche: Repos
├── Semaine 2
│   └── ... (progression: +2.5kg ou +1 rep)
├── ...
└── Semaine 12
    └── ... (deload / test)

Nutrition:
├── Calories: 2950 kcal/jour
├── Proteines: 164g | Glucides: 452g | Lipides: 82g
├── Plan repas suggere (base sur les recettes halal en DB)
│   ├── Petit-dejeuner: 3 options rotatives
│   ├── Dejeuner: 3 options rotatives
│   ├── Diner: 3 options rotatives
│   └── Collation: 2 options
└── Adapte aux preferences (cuisine, allergies, regime)
```

### Ce qui est genere automatiquement:

| Element | Source | Logique |
|---------|--------|---------|
| Split (PPL, Upper/Lower, Full Body) | TrainingFrequency | 2-3x→FB, 4x→UL, 5-6x→PPL |
| Exercices par seance | 621 exercices en DB | Filtre par muscle + equipement + niveau |
| Sets x Reps | Objectif utilisateur | Force:5x5, Masse:4x10, Seche:3x15 |
| Poids suggerees | Niveau + poids corps | Debutant: % poids corps |
| Duree programme | Objectif | Seche:8sem, Masse:12sem, Force:12sem |
| Progression | Semaine en cours | +2.5% poids ou +1 rep/semaine |
| Nutrition | TDEE + macros calcules | Recettes filtrees par preferences |
| Repos | Objectif + niveau | Force:3min, Masse:90s, Endurance:45s |

---

## 3. ENTITE BACKEND

### Nouvelle entite: Programme

```
Programme {
  Id: Guid
  UserId: Guid
  Title: string ("Prise de Masse - 12 semaines")
  Description: string
  Type: ProgrammeType (Mass, Cut, Strength, Endurance, Recomp, Health)
  DurationWeeks: int (8, 12, 16)
  CurrentWeek: int
  CurrentDay: int
  Split: string ("Push/Pull/Legs", "Upper/Lower", "Full Body")

  // Nutrition
  DailyCalories: int
  DailyProtein: decimal
  DailyCarbs: decimal
  DailyFat: decimal
  MealPlanJson: string (recettes suggerees par repas)

  // Status
  Status: ProgrammeStatus (Active, Completed, Paused, Abandoned)
  StartDate: DateTime
  EndDate: DateTime?
  CompletedSessions: int
  TotalSessions: int

  // Progress
  ProgressPercent: decimal
  WeeklyScheduleJson: string (planning semaine avec jours + muscles)

  CreatedAt, UpdatedAt
}
```

### Nouvelle entite: ProgrammeSession (seance planifiee)

```
ProgrammeSession {
  Id: Guid
  ProgrammeId: Guid
  WeekNumber: int (1-12)
  DayOfWeek: int (0=Lun, 6=Dim)
  Title: string ("Push - Pectoraux & Epaules")
  MuscleGroups: List<string>
  ExercisesJson: string (liste exercices avec sets/reps/poids)
  EstimatedDuration: int (minutes)

  // Lien vers session reelle (quand executee)
  SessionId: Guid? (link vers Session existante)
  IsCompleted: bool
  CompletedAt: DateTime?

  OrderInWeek: int (1, 2, 3...)
}
```

---

## 4. GENERATION DU PROGRAMME

### Algorithme (execute apres onboarding ou sur demande)

```
1. Determiner le split (selon frequence)
   2x → Full Body A / Full Body B
   3x → Full Body A / B / C
   4x → Upper A / Lower A / Upper B / Lower B
   5x → Push / Pull / Legs / Upper / Lower
   6x → Push / Pull / Legs / Push / Pull / Legs

2. Pour chaque jour d'entrainement:
   a. Selectionner les muscles cibles
   b. Choisir 5-8 exercices:
      - 2-3 composes (bench, squat, deadlift...)
      - 2-3 isolation
      - 1 core/abs
      - Filtrer par equipement disponible
      - Filtrer par blessures (exclure zones)
      - Adapter au niveau (pas de deadlift lourd pour debutant)
   c. Definir sets/reps selon objectif
   d. Estimer les poids (si niveau > debutant)

3. Planifier la progression:
   Semaines 1-4: Adaptation (charges moderees)
   Semaines 5-8: Progression (augmentation charges)
   Semaines 9-11: Intensification
   Semaine 12: Deload (reduction 40%)

4. Generer le plan nutrition:
   a. Calculer macros (deja fait dans onboarding)
   b. Selectionner recettes halal depuis DB:
      - Filtrer par regime + allergies + cuisines preferees
      - Respecter les macros cibles
      - Varier (pas les memes recettes chaque jour)
   c. Creer un plan repas rotatif sur 7 jours
```

---

## 5. DASHBOARD (HOME) - NOUVEAU DESIGN

### Layout inspiré Freeletics:

```
┌──────────────────────────────────┐
│ Salut Yassine! 👋                │
│ Semaine 3/12 - Prise de Masse   │
├──────────────────────────────────┤
│                                  │
│ ┌────────────────────────────┐  │
│ │ SEANCE DU JOUR             │  │
│ │ Push - Pectoraux & Epaules │  │
│ │ 6 exercices · 55 min       │  │
│ │ [Image exercice]           │  │
│ │                            │  │
│ │ [COMMENCER LA SEANCE]      │  │
│ └────────────────────────────┘  │
│                                  │
│ Planning de la semaine           │
│ ┌──┬──┬──┬──┬──┬──┬──┐         │
│ │Lu│Ma│Me│Je│Ve│Sa│Di│         │
│ │✅│💤│🏋│💤│🏋│💤│💤│         │
│ └──┴──┴──┴──┴──┴──┴──┘         │
│                                  │
│ Progression: 25% ████░░░░░░░░   │
│ 8/32 seances completees         │
│                                  │
│ ── OU ──                         │
│                                  │
│ [Creer une seance libre]         │
│                                  │
│ Nutrition du jour                │
│ 🍗 2950 kcal cible              │
│ P:164g | G:452g | L:82g         │
│ Repas suggere: [Voir]            │
│                                  │
└──────────────────────────────────┘
```

---

## 6. ENDPOINTS API

### Nouveaux endpoints:

```
POST /api/programmes/generate
  → Genere un programme complet base sur le profil
  → Retourne le programme avec toutes les seances

GET /api/programmes/active
  → Retourne le programme actif de l'utilisateur

GET /api/programmes/{id}
  → Detail du programme

GET /api/programmes/{id}/week/{weekNumber}
  → Seances de la semaine X

GET /api/programmes/{id}/today
  → Seance du jour (si jour d'entrainement)

POST /api/programmes/{id}/sessions/{sessionId}/start
  → Demarre la seance du programme (cree une Session liee)

PUT /api/programmes/{id}/pause
PUT /api/programmes/{id}/resume
PUT /api/programmes/{id}/abandon

GET /api/programmes/{id}/nutrition
  → Plan nutrition de la semaine avec recettes

GET /api/programmes/{id}/progress
  → Stats de progression (seances faites, poids evolution, etc.)
```

---

## 7. FLOW UTILISATEUR

```
1. Inscription → Onboarding (12 etapes)
2. Ecran loading: "Generation de ton programme..."
3. → POST /api/programmes/generate
4. Dashboard: Programme affiche avec seance du jour
5. L'utilisateur clique "Commencer la seance"
6. → Cree une Session (existante) liee au ProgrammeSession
7. Workout actif (log sets, timer, etc. - deja existant)
8. Fin seance → marquer ProgrammeSession comme complete
9. Progression mise a jour (X/total seances, % completion)
10. Semaine suivante: nouvelles seances avec progression (+poids/+reps)
```

---

## 8. PLAN D'IMPLEMENTATION

### Phase 1: Backend (2-3 jours)
1. Creer entites Programme + ProgrammeSession
2. Migration DB
3. Service ProgrammeService avec algorithme de generation
4. Endpoints API (generate, active, today, week, progress)
5. Integration avec Session existante (lien ProgrammeSession → Session)

### Phase 2: Frontend - Dashboard (2 jours)
1. Refaire le dashboard (Home) pour afficher le programme
2. Carte "Seance du jour" avec bouton commencer
3. Planning semaine (calendrier horizontal)
4. Barre de progression
5. Section "Creer seance libre"
6. Section nutrition du jour

### Phase 3: Frontend - Detail programme (1 jour)
1. Ecran detail programme (toutes les semaines)
2. Ecran semaine (seances de la semaine)
3. Lien entre ProgrammeSession et workout actif

### Phase 4: Nutrition (1 jour)
1. Generer plan repas depuis les 396 recettes halal
2. Afficher les recettes suggerees par repas
3. Lien vers detail recette

### Temps total estime: 6-7 jours

---

## 9. PRIORITE

Ce qui est le PLUS impactant pour l'utilisateur:
1. Programme genere automatiquement apres onboarding
2. Seance du jour visible sur le dashboard
3. Progression trackee (% completion)
4. Plan nutrition lie au programme

Ce qui peut attendre:
- Adaptation automatique des poids (progression intelligente)
- Deload automatique
- Changement de programme mid-course
