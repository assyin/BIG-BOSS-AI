# Sprint 1 — Résultats des tests

> Généré automatiquement le 2026-05-17T20:10:57.402Z par `tests/run-sprint1-tests.mjs`

## TL;DR

- **15/18** checks passés (83%)
- **3** failures

⚠️  **Échecs à corriger** — voir détail ci-dessous

## Détail par catégorie

### Backend xUnit (0/1)

| Statut | Test | Détail |
|---|---|---|
| ❌ | PushNotificationServiceTests | exit 1 |

### Mobile (1/1)

| Statut | Test | Détail |
|---|---|---|
| ✅ | pose-engine tests | 12/12 passed |

### DB (2/2)

| Statut | Test | Détail |
|---|---|---|
| ✅ | Exercices Darija 100% | 621/621 |
| ✅ | Recettes Darija 100% | 444/444 |

### R2 (0/2)

| Statut | Test | Détail |
|---|---|---|
| ❌ | Vidéo R2 unreachable | HTTP Command failed: curl -s -o /dev/null -w "%{http_code}" https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/biceps/concentration-curl.mp4 |
| ❌ | Script upload influenceur | C:\Python314\python.exe: can't open file 'C:\\Projects\\BIG-BOSS-AI\\mobile\\scripts\\upload_influen |

### E2E (12/12)

| Statut | Test | Détail |
|---|---|---|
| ✅ | Step 1 — Expo web chargé | http://localhost:8082/login |
| ✅ | Step 2 — Login réussi | yassine@gmail.com |
| ✅ | Step 3 — Home: 4 quick actions visibles | Badges=true Boutique=true Communauté=true Challenges=true |
| ✅ | Step 4 — Boutique: header marocain | header=true, arabe=true |
| ✅ | Step 5 — Achievements: header marocain | - |
| ✅ | Step 6 — Communauté: header marocain | - |
| ✅ | Step 7 — Nutrition: arabe + macros | arabe=true |
| ✅ | Step 8 — Recettes: badge 🇲🇦 Marocain | header=true, badge=true |
| ✅ | Step 9 — Coach: greeting arabe | arabe=true |
| ✅ | Step 10 — Profile: bouton Modifier visible | - |
| ✅ | Step 11 — Profile-edit: form rubriques | header=true, chips Homme=true, Objectif=true |
| ✅ | Step 12 — Backend FCM /push/stats | 2 users, 0 avec token |


## Screenshots E2E

Tous les screenshots de l'E2E Playwright sont dans `mobile/tests/screens/sprint1-e2e/` :

1. `01-initial.png` — Expo web chargé
2. `02-after-login.png` — Login réussi
3. `03-home-quick-actions.png` — Home + 4 quick actions
4. `04-boutique.png` — Boutique header marocain
5. `05-achievements.png` — Achievements header
6. `06-community.png` — Communauté header
7. `07-nutrition.png` — Nutrition macros marocaines
8. `08-recipes.png` — Recettes badge 🇲🇦
9. `09-coach.png` — Coach empty state arabe
10. `10-profile.png` — Profile avatar dorée + Modifier
11. `11-profile-edit.png` — Form rubriques chips


## ⚠️ Failures à corriger

- **[Backend xUnit] PushNotificationServiceTests** — exit 1
- **[R2] Vidéo R2 unreachable** — HTTP Command failed: curl -s -o /dev/null -w "%{http_code}" https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/biceps/concentration-curl.mp4
- **[R2] Script upload influenceur** — C:\Python314\python.exe: can't open file 'C:\\Projects\\BIG-BOSS-AI\\mobile\\scripts\\upload_influen


---

*Pour relancer: `node tests/run-sprint1-tests.mjs`*
*Pour HEADLESS (CI): `HEADLESS=1 node tests/run-sprint1-tests.mjs`*
