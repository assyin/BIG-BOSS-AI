# Big Boss Fitness - Implementation Programme Personnalise
## Suivi point par point

---

**Date debut**: 31 Mars 2026
**Date fin**: 31 Mars 2026
**Estimation**: 6-7 jours
**Status global**: TERMINE ✅

---

## PHASE 1: BACKEND - Entites & DB ✅
**Estimation**: 1 jour | **Realise**: 31 Mars 2026

### 1.1 Creer l'entite Programme ✅
- [x] Fichier: `BigBoss.Core/Entities/Programme.cs`
- [x] Champs: Id, UserId, Title, Description, Type, DurationWeeks, CurrentWeek, CurrentDay
- [x] Champs: Split, DailyCalories, DailyProtein, DailyCarbs, DailyFat
- [x] Champs: MealPlanJson (recettes suggerees)
- [x] Champs: Status (Active, Completed, Paused, Abandoned)
- [x] Champs: StartDate, EndDate, CompletedSessions, TotalSessions
- [x] Champs: ProgressPercent, WeeklyScheduleJson
- [x] Champs: CreatedAt, UpdatedAt
- [x] Enum: ProgrammeType (Mass, Cut, Strength, Endurance, Recomp, Health)
- [x] Enum: ProgrammeStatus (Active, Completed, Paused, Abandoned)

### 1.2 Creer l'entite ProgrammeSession ✅
- [x] Fichier: `BigBoss.Core/Entities/ProgrammeSession.cs`
- [x] Champs: Id, ProgrammeId, WeekNumber, DayOfWeek, PlannedDate
- [x] Champs: Title, MuscleGroups (List<string>)
- [x] Champs: ExercisesJson (exercices planifies avec sets/reps/poids)
- [x] Champs: EstimatedDuration (minutes)
- [x] Champs: SessionId (lien vers Session reelle quand executee)
- [x] Champs: Status (Planned, InProgress, Completed, Missed, Skipped)
- [x] Champs: CompletedAt, OrderInWeek

### 1.3 Migration DB ✅
- [x] Ajouter DbSet<Programme> et DbSet<ProgrammeSession> dans BigBossDbContext
- [x] Creer migration EF Core
- [x] Appliquer migration
- [x] Verifier tables creees

---

## PHASE 2: BACKEND - Algorithme de Generation ✅
**Estimation**: 1-2 jours | **Realise**: 31 Mars 2026

### 2.1 Service ProgrammeService - Generation ✅
- [x] Fichier: `BigBoss.Infrastructure/Services/ProgrammeService.cs`
- [x] Interface: `BigBoss.Core/Interfaces/IProgrammeService.cs`

### 2.2 Algorithme de split ✅
- [x] 2x/semaine → Full Body A / Full Body B
- [x] 3x/semaine → Full Body A / B / C
- [x] 4x/semaine → Upper A / Lower A / Upper B / Lower B
- [x] 5x/semaine → Push / Pull / Legs / Upper / Lower
- [x] 6x/semaine → Push / Pull / Legs x2
- [x] Mapper les jours preferes de l'utilisateur aux seances

### 2.3 Selection d'exercices par seance ✅
- [x] Pour chaque jour: determiner muscles cibles selon le split
- [x] Selectionner 5-8 exercices depuis les 621 en DB:
  - [x] 2-3 exercices composes (bench, squat, deadlift, overhead press)
  - [x] 2-3 exercices isolation
  - [x] 1 exercice core/abs
  - [x] Filtrer par equipement disponible de l'utilisateur (bitwise flags)
  - [x] Exclure exercices lies aux blessures declarees (mapping par zone)
  - [x] Adapter la difficulte au niveau (pas de deadlift lourd pour debutant)
- [x] Varier les exercices entre les semaines (seeded random par semaine)

### 2.4 Definition sets/reps/poids ✅
- [x] Selon objectif:
  - [x] Force (BuildStrength): 5 sets x 3-5 reps, repos 180s
  - [x] Masse (BuildMuscle): 4 sets x 8-12 reps, repos 90s
  - [x] Seche (LoseFat): 3 sets x 12-20 reps, repos 60s
  - [x] Endurance: 3 sets x 15-25 reps, repos 45s
  - [x] Recomposition: 4 sets x 8-12 reps, repos 75s
  - [x] Sante: 3 sets x 10-15 reps, repos 60s
- [x] Poids suggeres:
  - [x] Debutant: estimations basees sur % poids corporel
  - [x] Intermediaire+: basees sur historique si disponible

### 2.5 Planification progression sur X semaines ✅
- [x] Progression: +1 set tous les 4 semaines
- [x] Deload: -1 set, -2 reps chaque 4eme semaine
- [x] Adapter la duree totale selon l'objectif:
  - [x] Seche: 8 semaines
  - [x] Masse: 12 semaines
  - [x] Force: 12 semaines
  - [x] Endurance: 8 semaines
  - [x] Recomposition: 12 semaines
  - [x] Sante: 8 semaines

### 2.6 Generation plan nutrition ✅
- [x] Prendre les macros calcules (TDEE, P/G/L)
- [x] Selectionner recettes halal depuis les 396 en DB:
  - [x] Filtrer par regime alimentaire (DietType: vegetarian, vegan)
  - [x] Filtrer par allergies alimentaires (FoodAllergies)
  - [x] Filtrer par objectif (bulking, cutting)
  - [x] Repartir selon MealsPerDay (3, 4, 5 repas)
  - [x] Support mode Ramadan
- [x] Creer plan rotatif sur 7 jours
- [x] Stocker dans MealPlanJson (recipeId, title, calories, protein, carbs, fat, photoUrl)

---

## PHASE 3: BACKEND - Endpoints API ✅
**Estimation**: 1 jour | **Realise**: 31 Mars 2026

### 3.1 Controller ProgrammesController ✅
- [x] Fichier: `BigBoss.API/Controllers/ProgrammesController.cs`
- [x] Enregistre dans Program.cs (IProgrammeService + ProgrammeService)

### 3.2 Endpoints (12 au total) ✅

#### Generation
- [x] `POST /api/programmes/generate` → Genere programme complet

#### Consultation
- [x] `GET /api/programmes/active` → Programme actif
- [x] `GET /api/programmes/{id}` → Detail complet
- [x] `GET /api/programmes/{id}/week/{weekNumber}` → Seances de la semaine (+ auth check)
- [x] `GET /api/programmes/{id}/today` → Seance du jour (+ UpdateMissedSessions)

#### Execution
- [x] `POST /api/programmes/{id}/sessions/{psId}/start` → Demarre (ou reprend) la seance
- [x] `POST /api/programmes/{id}/sessions/{psId}/complete` → Marque terminee

#### Gestion
- [x] `PUT /api/programmes/{id}/pause` → Met en pause
- [x] `PUT /api/programmes/{id}/resume` → Reprend
- [x] `PUT /api/programmes/{id}/abandon` → Abandonne

#### Nutrition & Progression
- [x] `GET /api/programmes/{id}/nutrition` → Plan nutrition semaine (+ auth check)
- [x] `GET /api/programmes/{id}/progress` → Stats detaillees

---

## PHASE 4: BACKEND - Gestion de tous les scenarios ✅
**Estimation**: 1 jour | **Realise**: 31 Mars 2026

### 4.1 Reprise de seance interrompue ✅
- [x] SessionId lie ProgrammeSession → Session reelle
- [x] Si InProgress, StartProgrammeSession retourne la session existante
- [x] Bouton REPRENDRE dans le frontend

### 4.2 Seance manquee ✅
- [x] UpdateMissedSessionsAsync: check a chaque GET /today
- [x] Si PlannedDate passee et Status = Planned → Missed
- [x] Stats manquees trackees dans ProgrammeProgress

### 4.3 Seance en retard ✅
- [x] Peut demarrer depuis status Planned ou Missed

### 4.4 Fin de semaine - Calcul progression ✅
- [x] Deload automatique chaque 4eme semaine
- [x] Progression +1 set par phase de 4 semaines

### 4.5 Performance exceptionnelle ⬜ (Future feature)
- [ ] Detection reps > planned dans logSet
- [ ] Suggestion augmentation poids

### 4.6 Programme en pause ✅
- [x] PUT pause: Status → Paused
- [x] PUT resume: Recalcule dates restantes depuis aujourd'hui
- [x] Frontend: banner pause + bouton Reprendre

### 4.7 Abandon de programme ✅
- [x] PUT abandon: Status → Abandoned
- [x] L'utilisateur peut generer un nouveau programme

### 4.8 Programme termine ✅
- [x] Auto-detect: CompletedSessions >= TotalSessions dans SessionService.CompleteSessionAsync
- [x] Status → Completed, EndDate set
- [x] Ecran celebration + stats finales
- [x] Bouton "Generer un nouveau programme"

### 4.9 Changement d'objectif ⬜ (Future feature)
- [ ] Avertissement + abandon ancien + generation nouveau

### 4.10 Reconnexion / Persistance ✅
- [x] Tout en DB (pas de state local critique)
- [x] GET /programmes/active retourne l'etat actuel
- [x] GET /sessions/current retourne seance en cours

### 4.11 Nutrition - Suivi quotidien ✅
- [x] Plan repas genere et stocke dans MealPlanJson
- [x] Repas suggeres affiches dans le dashboard (TodayMeals)
- [x] Plan nutrition semaine accessible

### 4.12 Pas de connexion internet ⬜ (Future feature)
- [ ] Cache local seances
- [ ] Sync offline → online

---

## PHASE 5: FRONTEND - Dashboard & Ecrans ✅
**Estimation**: 2 jours | **Realise**: 31 Mars 2026

### 5.1 Nouveau Dashboard (Home) ✅
- [x] Fichier: `src/app/(main)/index.tsx`
- [x] Header: "Salut {nom}! - Semaine X/Y"
- [x] Carte "Seance du jour" (titre, muscles badges, exercices, duree)
- [x] Bouton "COMMENCER" / "REPRENDRE"
- [x] Jour de repos: message + emoji
- [x] Planning semaine: calendrier horizontal (Lu-Di) avec status icons
- [x] Barre de progression: X/Y seances (cliquable → detail programme)
- [x] Separator "── ou ──"
- [x] Bouton: "Creer une seance libre"
- [x] Section nutrition: macros + TodayMeals + lien plan semaine
- [x] Pas de programme: bouton "Generer mon programme personnalise"
- [x] Programme en pause: banner warning + bouton Reprendre
- [x] Platform.OS web alert handling (window.alert)

### 5.2 Ecran Detail Programme ✅
- [x] Fichier: `src/app/(main)/programme/index.tsx`
- [x] Vue toutes les semaines (collapse/expand)
- [x] Semaine courante auto-expanded avec badge "En cours"
- [x] Pour chaque semaine: liste seances avec status icons
- [x] Stats globales: semaine, seances, adherence
- [x] Barre de progression
- [x] Boutons Pause / Abandonner avec Platform.OS checks

### 5.3 Ecran Semaine ✅
- [x] Fichier: `src/app/(main)/programme/week.tsx`
- [x] Liste des seances avec status badges
- [x] Pour chaque seance: exercices (nom, sets x reps, poids), muscles, duree
- [x] Boutons COMMENCER / REPRENDRE
- [x] Programme context set dans session store

### 5.4 Integration avec workflow existant ✅
- [x] Dashboard: POST start → Session dans store → router.push active
- [x] Week screen: meme flow avec programmeContext
- [x] Backend SessionService.CompleteSessionAsync: auto-complete ProgrammeSession
- [x] Backend: incremente CompletedSessions++, recalcule ProgressPercent
- [x] Backend: auto-complete Programme si toutes seances faites

### 5.5 Ecran programme termine ✅
- [x] Fichier: `src/app/(main)/programme/completed.tsx`
- [x] Animation trophy (spring + fade)
- [x] Stats finales: seances, semaines, adherence, manquees
- [x] Bouton "Generer un nouveau programme"
- [x] Detection dans sessions/summary.tsx (progressPercent >= 100)

---

## PHASE 6: FRONTEND - Nutrition dans le programme ✅
**Estimation**: 1 jour | **Realise**: 31 Mars 2026

### 6.1 Plan repas du jour ✅
- [x] Composant TodayMeals dans le dashboard (inline)
- [x] Parse mealPlanJson → jour courant (lundi=1 ... dimanche=7)
- [x] 3-5 repas suggeres avec:
  - [x] Icone par type (sunny, restaurant, moon, cafe)
  - [x] Nom de la recette
  - [x] Macros (cal, P, G, L)

### 6.2 Vue plan nutrition semaine ✅
- [x] Fichier: `src/app/(main)/programme/nutrition-plan.tsx`
- [x] Accessible depuis le dashboard (lien "Plan semaine")
- [x] Selecteur jour horizontal (Lundi-Dimanche) avec tab active orange
- [x] Objectifs journaliers (calories, prot, gluc, lip)
- [x] Total du jour vs objectif avec barre de progression
- [x] Carte par repas (type, titre recette, macros en chips)
- [x] Auto-selection du jour courant

---

## PHASE 7: TESTS & POLISH ✅
**Estimation**: 1 jour | **Realise**: 31 Mars 2026

### 7.1 Test build complet ✅
- [x] Backend: `dotnet build` → 0 erreurs
- [x] Frontend: `npx tsc --noEmit` → 0 nouvelles erreurs
- [x] Toutes les routes enregistrees dans _layout.tsx (4 routes programme hidden)

### 7.2 Edge cases corriges ✅
- [x] Race condition: CompletedSessions++ au lieu de COUNT query
- [x] Authorization: userId check sur GetWeekSessions et GetNutritionPlan
- [x] Double start: InProgress session retourne session existante (pas de doublon)
- [x] Platform.OS: web alerts (window.alert) sur dashboard (4 endroits)
- [x] Utilisateur sans programme → bouton "Generer mon programme"
- [x] Programme en pause → banner warning + bouton Reprendre
- [x] Jour de repos → message "Profite de ta recuperation"

### 7.3 Performance ✅
- [x] Promise.all pour chargement parallele (today + week + progress)
- [x] useFocusEffect pour reload a chaque navigation
- [x] RefreshControl (pull-to-refresh) sur tous les ecrans
- [x] maxWidth: 500 + webWrapper pour responsive

---

## CHECKLIST GLOBALE

| Phase | Description | Status |
|-------|-------------|--------|
| 1.1 | Entite Programme | ✅ |
| 1.2 | Entite ProgrammeSession | ✅ |
| 1.3 | Migration DB | ✅ |
| 2.1 | ProgrammeService + Interface | ✅ |
| 2.2 | Algorithme split (2x-6x) | ✅ |
| 2.3 | Selection exercices (equip/blessures/niveau) | ✅ |
| 2.4 | Definition sets/reps/poids par objectif | ✅ |
| 2.5 | Progression + deload semaines | ✅ |
| 2.6 | Plan nutrition halal 7 jours | ✅ |
| 3.1 | ProgrammesController | ✅ |
| 3.2 | 12 endpoints API securises | ✅ |
| 4.1 | Reprise seance (SessionId + REPRENDRE) | ✅ |
| 4.2 | Seance manquee (UpdateMissedSessions) | ✅ |
| 4.3 | Seance en retard (start from Missed) | ✅ |
| 4.4 | Progression/deload auto | ✅ |
| 4.5 | Performance exceptionnelle | ⬜ Future |
| 4.6 | Pause/Resume (endpoints + frontend) | ✅ |
| 4.7 | Abandon (endpoint + redirect) | ✅ |
| 4.8 | Programme termine (auto-detect + celebration) | ✅ |
| 4.9 | Changement objectif | ⬜ Future |
| 4.10 | Persistance DB | ✅ |
| 4.11 | Nutrition suivi (plan repas + TodayMeals) | ✅ |
| 4.12 | Mode offline | ⬜ Future |
| 5.1 | Dashboard refait (Freeletics-style) | ✅ |
| 5.2 | Detail programme (semaines collapse) | ✅ |
| 5.3 | Ecran semaine (exercices + start) | ✅ |
| 5.4 | Integration workout (auto-complete backend) | ✅ |
| 5.5 | Programme termine (trophy + stats) | ✅ |
| 6.1 | Plan repas jour (TodayMeals dashboard) | ✅ |
| 6.2 | Plan nutrition semaine (selector jour) | ✅ |
| 7.1 | Build complet (0 erreurs) | ✅ |
| 7.2 | Edge cases (auth, race, platform, restart) | ✅ |
| 7.3 | Performance (parallel loads, responsive) | ✅ |

---

## FICHIERS CREES / MODIFIES

### Backend (4 fichiers)
- `BigBoss.Core/Entities/Programme.cs` - Entite + enums
- `BigBoss.Core/Entities/ProgrammeSession.cs` - Entite + enum
- `BigBoss.Core/Interfaces/IProgrammeService.cs` - Interface
- `BigBoss.Infrastructure/Services/ProgrammeService.cs` - Algorithme complet (~900 lignes)
- `BigBoss.API/Controllers/ProgrammesController.cs` - 12 endpoints
- `BigBoss.Infrastructure/Data/BigBossDbContext.cs` - DbSet ajoutés
- `BigBoss.Infrastructure/Services/SessionService.cs` - Auto-complete ProgrammeSession
- `BigBoss.API/Program.cs` - Service registration

### Frontend (8 fichiers)
- `mobile/src/services/programme.service.ts` - 12 methodes API
- `mobile/src/store/session.store.ts` - programmeContext ajoute
- `mobile/src/app/(main)/index.tsx` - Dashboard refait (Freeletics-style)
- `mobile/src/app/(main)/programme/index.tsx` - Detail programme
- `mobile/src/app/(main)/programme/week.tsx` - Vue semaine
- `mobile/src/app/(main)/programme/completed.tsx` - Ecran celebration
- `mobile/src/app/(main)/programme/nutrition-plan.tsx` - Plan nutrition semaine
- `mobile/src/app/(main)/sessions/summary.tsx` - Detection programme complete
- `mobile/src/app/(main)/_layout.tsx` - Routes enregistrees
