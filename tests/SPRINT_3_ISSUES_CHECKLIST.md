# Checklist visuelle — Sprint 3 (suivi orchestration)

> Cahier de route à cocher pendant l'orchestration Playwright HEADED.
> Pour chaque étape : ✅ OK / ❌ KO / ⚠️ partiel + note.

Date orchestration : ___________

---

## A — Backend xUnit (`dotnet test`)

### NotificationJobs (3.1)
- [ ] `WorkoutReminders_FiltersInactiveUsers` vert
- [ ] `WorkoutReminders_SkipsSuspended` vert
- [ ] `StreakReminders_OnlyUsersWithStreak` vert
- [ ] `LiveStartingSoon_WindowMatches` vert
- [ ] `WeeklyRecap_SkipsUsersWithoutSessions` vert
- [ ] `Templates_ReturnDarijaIfPreferred` vert

### SessionOffline (3.2)
- [ ] `LogSet_NewClientUuid_AppendsSet` vert
- [ ] `LogSet_DuplicateClientUuid_IsNoOp` vert
- [ ] `LogSet_WithoutClientUuid_AlwaysAppends` vert
- [ ] `ProcessedClientUuids_BoundedTo100` vert
- [ ] `Concurrent_SameUuid_OneSetOnly` vert

### MuscleBalance (3.4)
- [ ] `Returns_10_Muscles_InOrder` vert
- [ ] `MaxMuscle_Has_Ratio_1` vert
- [ ] `Skipped_Sessions_Excluded` vert
- [ ] `Days_QueryParam_Clamped` vert

---

## B — Mobile unit tests (`npx tsx`)

### body-metrics (3.4)
- [ ] `calcIMC(70,175) = 22.9 normal` vert
- [ ] IMC 4 catégories OK
- [ ] IMC invalide → null
- [ ] `calcFFMI(70,175,15) ≈ 19.4 good` vert
- [ ] FFMI sans bodyFat → null
- [ ] `targetWeightForImc(175,22) = 67.4` vert
- [ ] Labels darija présents

### offline-queue (3.2)
- [ ] `generateUuid()` format v4 valide
- [ ] enqueue ajoute
- [ ] enqueue dédupe par id
- [ ] getCount reflète la queue
- [ ] remove cible bon id
- [ ] dropForSession filtre

---

## C — API integration (curl + jq)

### Hangfire (3.1)
- [ ] `/health` 200
- [ ] `/hangfire` localhost 200
- [ ] `/hangfire` non-loopback sans token 401
- [ ] Trigger workout job 204 + log `WorkoutReminders: X/Y`
- [ ] DB hangfire.set : 4 recurring-jobs

### Offline idempotence (3.2)
- [ ] Login → token OK
- [ ] LogSet ClientUuid=X 1ère fois → SetsCompleted+1
- [ ] LogSet ClientUuid=X 2ème fois → SetsCompleted INCHANGÉ (idempotent)
- [ ] LogSet sans ClientUuid → SetsCompleted+1 à chaque appel
- [ ] DB : `processed_client_uuids` contient X

### Favoris (3.3)
- [ ] GET favorites vide
- [ ] POST favorite → added=true
- [ ] POST re-favorite → alreadyFavorite=true
- [ ] GET favorites contient recipeId
- [ ] DELETE → removed=true

### Muscle balance (3.4)
- [ ] GET muscle-balance → 10 muscles
- [ ] ?days=7 → days:7
- [ ] ?days=999 → clampé 365

### Grocery list (3.5)
- [ ] GET grocery-list → 8 catégories emoji
- [ ] Items dédupliqués + qty sommées

---

## D — Playwright HEADED (20 étapes)

### Auth + landing
- [ ] 1. Splash → login redirect
- [ ] 2. Login OK → home
- [ ] 3. Tab bar 5 onglets visibles

### 3.4 IMC + FFMI + Radar
- [ ] 4. Profil → Outils IA → Ma Progression
- [ ] 5. Tab Mesures : cards IMC + FFMI avec couleur catégorie
- [ ] 6. IMC hint "Cible XX kg"
- [ ] 7. Hint bodyFat si absent + cliquable
- [ ] 8. Tab Performances : radar SVG 10 axes gold safran + stats footer

### 3.3 Favoris recettes
- [ ] 9. Nutrition > Recettes : cœur visible sur cards
- [ ] 10. Tap cœur A → optimistic plein
- [ ] 11. Filtre "Favoris ❤️" → liste filtrée

### 3.5 Grocery list
- [ ] 12. Programme → Liste de courses bouton visible
- [ ] 13. 8 catégories emoji groupées
- [ ] 14. Check 3 items → persisté après retour

### 3.2 Offline log sets
- [ ] 15. Session active sans badge offline
- [ ] 16. Network Offline → log set → badge rouge "1 en attente"
- [ ] 17. Network Online → badge vert "Sync en cours" → disparaît
- [ ] 18. DB : 1 set en `reps_completed` (pas doublon)

### 3.1 Push notifications
- [ ] 19. Trigger workout-reminders → 204
- [ ] 20. Push reçu sur device test (titre attendu selon langue)

---

## E — DB checks (psql)

- [ ] `session_exercises.processed_client_uuids` jsonb NOT NULL default `[]`
- [ ] `hangfire.set` 4 rows `recurring-jobs`
- [ ] Table `user_favorite_recipes` + FK
- [ ] Au moins 1 user avec `push_token` non-null

---

## F — Smoke tests device (post-orchestration)

- [ ] Push workout reminder arrive sur téléphone
- [ ] Push en darija si `PreferredLanguage=darija`
- [ ] Mode avion → 3 sets → online → remontent au backend
- [ ] WhatsApp share grocery list ouvre WhatsApp avec texte

---

## Notes orchestration

| Étape KO | Reproduction | Hypothèse cause | Action |
|---|---|---|---|
| _ex_ | _ex: tap cœur reset au scroll_ | _ex: state pas dans Zustand_ | _ex: revoir favorites.store.ts:42_ |

---

## Bilan final

- Total checks : **__/79**
- Score : **__%**
- Bloqueurs P0 : ______________________
- À reporter Sprint 4 : ______________________
- Prêt pour merge / déploiement beta : ☐ oui  ☐ non
