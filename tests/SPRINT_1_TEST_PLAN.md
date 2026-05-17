# Plan de test — Sprint 1 Big Boss Fitness

> Validation des 4 livrables du Sprint 1 (2026-05-16/17).
> Apple Sign In (1.1) reporté à la phase Soumission Stores — exclu de ce plan.

## Scope

| ID | Livrable | Commit |
|---|---|---|
| 1.2 | FCM polish (Expo Push + AdminPushController + Streak/Live push) | `deecef8` |
| 1.3 | R2 workflow influenceur (script + doc) | `b88b021` |
| 1.4 | Coach Vision TF.js + MoveNet + pose-engine + overlay SVG | `0e93429` / `f890558` / `54d0077` |
| 1.5 | Darija 100 % coverage (621 exos + 444 recettes) | `62abed1` |

## Types de tests

### A — Tests unitaires automatisés

**Backend (xUnit + Moq + FluentAssertions)**
- `BigBoss.Tests/Services/PushNotificationServiceTests.cs`
  - `SaveTokenAsync` met à jour le PushToken du user
  - `SendToUserAsync` ne fait rien si user sans token
  - `SendToAllAsync` filtre les users avec `NotificationsEnabled = false`
- `BigBoss.Tests/Services/StreakServiceTests.cs`
  - `CheckStreakMilestonesAsync` envoie push aux jours 7/30/100
  - Pas de push aux jours non-milestones
  - Push contient l'emoji correct (🔥/💪/🏆)

**Mobile (Node runner via Playwright)**
- `mobile/tests/unit-pose-engine.mjs`
  - `calculateAngle` retourne 90° pour vecteurs perpendiculaires
  - `calculateAngle` retourne 180° pour vecteurs alignés
  - `EXERCISE_CONFIGS.squat.detectRep` compte une rep sur cycle up→down→up

### B — Tests d'intégration API (curl)

Tests bout-en-bout sur backend live (port 5050) :
- POST /api/auth/login → token JWT
- GET /api/admin/push/stats → JSON `{total, withToken, enabledForPush}`
- POST /api/admin/push/test {email, title, body} → 200
- GET /api/exercises → 200 (vérif n'a pas régressé)
- DB query Darija coverage → 621/621 + 444/444

### C — Tests visuels Playwright (HEADED, slow-mo)

Tu pourras **suivre le navigateur en direct** sur ton écran.
Playwright lance Chromium visible avec slowMo=500ms.

**Parcours utilisateur complet (12 étapes) :**

1. Page racine Expo web → screenshot login
2. Login `yassine@gmail.com` / `Admin123!`
3. Home dashboard → vérifier quick actions (4 icônes visibles)
4. Click "Boutique" → vérifier header gradient + price badges gold
5. Back + click "Badges" → vérifier header + cards medal
6. Back + click "Communauté" → vérifier header gradient
7. Back + click "Challenges" → vérifier liste
8. Tab Nutrition → vérifier 4 macros en palette marocaine
9. Tab Coach → vérifier empty state arabe + bouton or
10. Tab Profil → vérifier avatar dorée + bouton "Modifier"
11. Click "Modifier" → vérifier form rubriques chips
12. Toggle language Darija → save → vérifier retour profile

Chaque étape capture un screenshot dans `tests/screens/sprint1-e2e/`.

### D — DB checks (psql)

- Darija coverage exercices : `SELECT COUNT(*) FILTER (WHERE name_darija IS NOT NULL AND name_darija != name_fr) FROM exercises;` → 621
- Darija coverage recettes : `SELECT COUNT(*) FILTER (WHERE "TitleDarija" IS NOT NULL AND "TitleDarija" != "TitleFr") FROM "Recipes";` → 444
- Push token wiring : `SELECT COUNT(*) FROM users WHERE "PushToken" IS NOT NULL;` → ≥ 1 si test mobile effectué

### E — Workflow R2 dry-run

- `node scripts/upload_influencer_videos.py` → output "Excel mapping: 100 fichiers attendus, Local trouvés: 0"
- HEAD https://pub-11df...r2.dev/biceps/concentration-curl.mp4 → 200

## Critères de succès

| Critère | Statut attendu |
|---|---|
| Tous les tests unitaires xUnit verts | ✅ |
| Tous les tests pose-engine verts | ✅ |
| Tous les endpoints API admin répondent 200 | ✅ |
| Playwright 12/12 étapes ok + screenshots | ✅ |
| Darija coverage 100 % en DB | ✅ |
| R2 dry-run script OK | ✅ |

## Lancement

```bash
# 1. Backend unit tests
cd backend && dotnet test BigBoss.Tests --filter "FullyQualifiedName~PushNotificationService|FullyQualifiedName~StreakService"

# 2. Mobile pose-engine tests
cd mobile && node tests/unit-pose-engine.mjs

# 3. Playwright E2E (HEADED mode pour suivre en live)
cd mobile && node tests/e2e-sprint1.mjs

# 4. Tout d'un coup via orchestrateur
node tests/run-sprint1-tests.mjs
```

Le orchestrateur produit `SPRINT_1_TEST_RESULTS.md` avec ✅/❌ par check.
