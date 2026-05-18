# Plan de test — Sprint 3 Big Boss Fitness

> Validation des 5 livrables du Sprint 3 — Engagement & Rétention (2026-05-17/18).
> Cible : orchestration visuelle Playwright HEADED pour suivi temps réel.

## Scope Sprint 3

| ID | Livrable | Commit |
|---|---|---|
| 3.1 | Scheduler Hangfire + 4 jobs notifications FR/Darija/AR | `b8a8a65` |
| 3.2 | Mode offline log sets + idempotence backend ClientUuid | `fff5dfc` |
| 3.3 | Favoris recettes (offline-first sync) | (commits antérieurs) |
| 3.4 | IMC + FFMI + radar musculaire SVG | `74feca6` |
| 3.5 | Liste de courses auto + WhatsApp share | (commits antérieurs) |

---

## Types de tests

### A — Tests unitaires automatisés (à écrire avant orchestration)

#### A.1 Backend xUnit (`backend/BigBoss.Tests/`)

**`Services/NotificationJobsServiceTests.cs`** (Sprint 3.1)
- [ ] `SendWorkoutRemindersAsync` cible users avec `NotificationsEnabled=true`, `PushToken!=null`, `LastActivityDate < UtcNow.AddHours(-24)`
- [ ] `SendWorkoutRemindersAsync` skip les users suspendus
- [ ] `SendStreakRemindersAsync` cible users avec `CurrentStreak > 0` et `LastActivityDate < today`
- [ ] `SendLiveStartingSoonAsync` matche les lives entre `Now+30min` et `Now+35min` avec `StartedAt=null`
- [ ] `SendWeeklyRecapAsync` skip users sans session dans les 7 derniers jours
- [ ] Templates retournent darija si `PreferredLanguage=="darija"`, AR si `"ar"`, FR sinon

**`Services/SessionServiceOfflineTests.cs`** (Sprint 3.2)
- [ ] `LogSetAsync` avec `ClientUuid` neuf : ajoute le set + append UUID dans `ProcessedClientUuids`
- [ ] `LogSetAsync` avec `ClientUuid` déjà traité : no-op, retourne l'état actuel sans dupliquer le set
- [ ] `LogSetAsync` sans `ClientUuid` : comportement classique (toujours ajouter le set)
- [ ] `ProcessedClientUuids` est borné à 100 (FIFO bounded)
- [ ] Concurrent `LogSetAsync` même UUID : un seul set en DB (test serialisé)

**`Services/MuscleBalanceTests.cs`** (Sprint 3.4)
- [ ] `GET /api/me/muscle-balance` retourne 10 muscles dans l'ordre {Chest, Back, Shoulders, Biceps, Triceps, Quad, Hamstr, Glutes, Abs, Calves}
- [ ] `volumeRatio` = 1.0 pour le muscle dominant, < 1 pour les autres
- [ ] Sets/volume agrégés correctement sur 30 jours (exclu `IsSkipped=true`)
- [ ] `days` query param clampé [7, 365]

#### A.2 Mobile (`mobile/tests/unit-*.ts` via tsx runner)

**`unit-body-metrics.ts`** (Sprint 3.4)
- [ ] `calcIMC(70, 175)` → `{ value: 22.9, category: 'normal' }`
- [ ] `calcIMC(50, 175)` → `category: 'underweight'`
- [ ] `calcIMC(90, 175)` → `category: 'overweight'`
- [ ] `calcIMC(110, 175)` → `category: 'obese'`
- [ ] `calcIMC(0, 175)` → `null` (invalide)
- [ ] `calcFFMI(70, 175, 15)` → `value ≈ 19.4, category: 'good'`
- [ ] `calcFFMI(70, 175, null)` → `null` (bodyFat manquant)
- [ ] `targetWeightForImc(175, 22)` → `67.4`
- [ ] Labels darija présents : `وزن طبيعي`, `كتلة عضلية`

**`unit-offline-queue.ts`** (Sprint 3.2)
- [ ] `generateUuid()` retourne un v4 valide (8-4-4-4-12 avec 4 en pos 13)
- [ ] `enqueue` ajoute l'op
- [ ] `enqueue` même id : pas de doublon
- [ ] `getCount()` reflète la taille de la queue
- [ ] `remove(id)` retire seulement l'op visée
- [ ] `dropForSession(sessionId)` filtre par session

### B — Tests d'intégration API (curl + jq)

**Hangfire (Sprint 3.1)**
- [ ] `GET http://localhost:5050/health` → `{status: "healthy"}`
- [ ] `GET http://localhost:5050/hangfire` depuis localhost → 200 HTML dashboard
- [ ] `GET http://localhost:5050/hangfire` depuis IP non-loopback sans token → 401
- [ ] `POST /hangfire/recurring/trigger jobs[]=workout-reminders-daily` → 204 + log `WorkoutReminders: X/Y`
- [ ] DB query `SELECT key, value FROM hangfire.set WHERE key='recurring-jobs'` → 4 rows (workout, streak, live, weekly)

**Offline idempotence (Sprint 3.2)**
- [ ] Login → token JWT
- [ ] `POST /api/sessions/log-set` avec `clientUuid=X` + reps=10 weightKg=60 → 200 + SetsCompleted incrémenté
- [ ] Re-POST exact même body (même clientUuid) → 200 mais SetsCompleted PAS incrémenté (idempotent)
- [ ] `POST` sans `clientUuid` → 200 + SetsCompleted incrémenté à chaque appel (comportement classique)
- [ ] DB query `SELECT processed_client_uuids FROM session_exercises WHERE id=...` contient X

**Favoris (Sprint 3.3)**
- [ ] `GET /api/users/me/favorites/recipes` (auth user) → `{recipeIds: []}`
- [ ] `POST /api/users/me/favorites/recipes/{recipeId}` → `{added: true}`
- [ ] Re-POST même recipe → `{added: true, alreadyFavorite: true}`
- [ ] `GET ...` → `{recipeIds: [recipeId]}`
- [ ] `DELETE /api/users/me/favorites/recipes/{recipeId}` → `{removed: true}`

**Muscle balance (Sprint 3.4)**
- [ ] `GET /api/me/muscle-balance` (auth) → `{days: 30, muscles: [10 items]}`
- [ ] `GET /api/me/muscle-balance?days=7` → `days: 7`
- [ ] `GET /api/me/muscle-balance?days=999` → clampé à 365

**Grocery list (Sprint 3.5)**
- [ ] `GET /api/programmes/{id}/grocery-list?week=1` (auth + programme actif) → catégorisé en 8 emojis
- [ ] Items dédupliqués + quantités sommées

### C — Tests visuels Playwright HEADED (orchestration demain)

**Préparation** : Expo web sur port 8082, backend sur 5050, user de test seedé.

**Parcours utilisateur — 20 étapes** (capture screenshot à chaque étape dans `tests/screens/sprint3-e2e/`)

#### C.1 — Auth + landing (étapes 1-3)
1. [ ] Page racine → splash → redirect login
2. [ ] Login `yassine@gmail.com` → home dashboard
3. [ ] Tab Profil visible avec 4 tabs (Home/Sessions/Nutrition/Coach/Profil)

#### C.2 — Sprint 3.4 IMC + FFMI + Radar (étapes 4-8)
4. [ ] Profil → section "Outils IA" → tap "Ma Progression" → écran progress
5. [ ] Tab Mesures → vérifier 2 cards IMC + FFMI affichées avec valeurs colorées (gold/vert/rouge selon catégorie)
6. [ ] IMC affiche hint "Cible : XX kg (IMC 22)" si taille présente
7. [ ] Si bodyFat absent : hint "Renseigne ton % de masse grasse" cliquable
8. [ ] Tab Performances → radar musculaire visible (10 axes SVG gold safran sur grille tadelakt) + footer "X sets · Y kg·reps"

#### C.3 — Sprint 3.3 Favoris recettes (étapes 9-11)
9. [ ] Tab Nutrition → onglet Recettes → liste recettes avec icône cœur sur chaque card
10. [ ] Tap cœur sur recette A → cœur devient plein (optimistic) + toast/sync silencieux
11. [ ] Filtre "Favoris ❤️" en haut → liste filtrée affiche uniquement recette A

#### C.4 — Sprint 3.5 Grocery list (étapes 12-14)
12. [ ] Programme → semaine en cours → bouton "Liste de courses 🛒" visible
13. [ ] Tap → écran grocery-list avec items groupés par 8 catégories emoji
14. [ ] Cocher 3 items → revenir + retour : état checked persisté (SecureStore)

#### C.5 — Sprint 3.2 Offline log sets (étapes 15-18)
15. [ ] Lancer une session → écran active.tsx → vérifier qu'aucun badge "X sets en attente" n'apparaît (online)
16. [ ] DevTools → mode offline (Network throttling Offline) → log un set : badge rouge "1 set en attente" apparaît
17. [ ] DevTools → online → vérifier badge devient vert "Sync en cours" puis disparaît
18. [ ] DB check : 1 seul set en `session_exercises.reps_completed` (pas de doublon malgré le replay)

#### C.6 — Sprint 3.1 Push notifications (étapes 19-20)
19. [ ] Backend admin → POST `/hangfire/recurring/trigger jobs[]=workout-reminders-daily` → 204
20. [ ] Téléphone test (ou Expo Push Tool) : push reçu avec titre `Yallah à la salle ! 💪` ou darija `يلا الصالة! 💪` selon `PreferredLanguage`

### D — DB checks (psql via docker exec)

- [ ] Colonne `session_exercises.processed_client_uuids` existe en jsonb NOT NULL DEFAULT `[]`
- [ ] Table `hangfire.set` contient 4 rows `recurring-jobs` (workout, streak, live, weekly)
- [ ] Table `user_favorite_recipes` existe avec FK vers users + recipes
- [ ] Au moins 1 user a `push_token IS NOT NULL` (sinon les jobs ne testent rien)

### E — Smoke tests manuels (à valider sur device réel)

- [ ] Push notification arrive sur téléphone (workout reminder)
- [ ] Push notification en darija si `PreferredLanguage=darija`
- [ ] Mode avion ON sur téléphone → log 3 sets → mode avion OFF → les 3 sets remontent en backend
- [ ] WhatsApp share du grocery list ouvre WhatsApp avec le texte pré-rempli

---

## Critères de succès

| Critère | Statut attendu |
|---|---|
| xUnit backend (NotificationJobs, SessionOffline, MuscleBalance) | ✅ 100 % |
| Unit mobile (body-metrics, offline-queue) | ✅ 100 % |
| Intégration API (8 endpoints) | ✅ 8/8 |
| Playwright 20/20 étapes + screenshots | ✅ |
| DB checks (4 vérifications) | ✅ 4/4 |
| Smoke tests manuels (4 vérifications device) | ☐ à faire post-orchestration |

---

## Lancement (à exécuter demain)

```bash
# 1. Backend unit tests
cd backend && dotnet test BigBoss.Tests --filter "FullyQualifiedName~NotificationJobs|FullyQualifiedName~SessionServiceOffline|FullyQualifiedName~MuscleBalance"

# 2. Mobile unit tests
cd mobile && npx tsx tests/unit-body-metrics.ts && npx tsx tests/unit-offline-queue.ts

# 3. Intégration API curl
node tests/run-sprint3-api-tests.mjs

# 4. Playwright E2E (HEADED, slowMo=500ms pour suivre live)
cd mobile && node tests/e2e-sprint3.mjs

# 5. Orchestrateur tout-en-un (génère SPRINT_3_TEST_RESULTS.md)
node tests/run-sprint3-tests.mjs
```

L'orchestrateur produit `tests/SPRINT_3_TEST_RESULTS.md` avec ✅/❌ par check + chemin du screenshot.

## Plan d'orchestration visuelle (demain)

| Heure | Étape | Action |
|---|---|---|
| T+0 | Lancer backend + Expo web | `pwsh start-backend.ps1` + `cd mobile && npx expo start --web --port 8082` |
| T+2min | Vérifier services up | `curl /health` + `curl http://localhost:8082` |
| T+3min | Lancer orchestrateur | `node tests/run-sprint3-tests.mjs` |
| T+3-15min | Suivre Playwright HEADED en direct | Browser Chromium visible, 20 étapes |
| T+15min | Review du markdown final | `tests/SPRINT_3_TEST_RESULTS.md` |
| T+15-30min | Smoke tests device (push, offline) | Téléphone Expo Go |

Total estimé : **~30 min** pour validation complète Sprint 3.
