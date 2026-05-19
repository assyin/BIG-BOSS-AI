# Plan de test — Sprints 4.4 + 5.x + 6.x

> Validation des **8 sprints livrés depuis le dernier test** (Sprint 3 le 18 mai).
> Cible : orchestration Playwright HEADED pour suivi temps réel par Yassine.

## Scope (8 sprints)

| ID | Livrable | Commit |
|---|---|---|
| 4.4 | Claude Vision photos progression | `fe5246d` |
| 5.1 | Feed social complet (modération + scroll + photo + share) | `7867579` |
| 5.2 | Gym buddies matching | `73e0a6e` |
| 5.3 | Live streaming Cloudflare (4 étapes) | `5b6472f` |
| 5.4 | Dashboard influenceur | `b0f50c0` |
| 6.1 | Admin dashboard tech | `07d23c3` |
| 6.2 | Cache Redis agressif | `d97d016` |
| 6.3 | Audit OWASP Top 10 | `86534e3` |

---

## Phase A — Backend xUnit (à écrire avant orchestration)

**`Services/BuddyServiceTests.cs`** (Sprint 5.2)
- [ ] `GetRecommendedAsync_SameCity_ScoresHighest` : 40 points + dans reasons
- [ ] `GetRecommendedAsync_SameGym_AddsExtra20` : ville + salle = 60
- [ ] `GetRecommendedAsync_ExcludesAlreadyConnected` : filtre out connexions Accepted
- [ ] `RequestConnectionAsync_MutualMatch_AutoAccepts` : si l'autre user avait déjà demandé → Accepted direct
- [ ] `RequestConnectionAsync_SelfConnect_Throws` : InvalidOperationException

**`Services/FeedServiceModerationTests.cs`** (Sprint 5.1)
- [ ] `CreatePostAsync_ToxicContent_FlagsAutomatically` : mock IClaudeService renvoie ShouldFlag=true → IsFlagged=true
- [ ] `CreatePostAsync_SafeContent_NotFlagged` : mock score 0.1 → IsFlagged=false
- [ ] `CommentAsync_ToxicComment_IsFlagged` : idem côté commentaires

**`Services/CloudflareStreamServiceTests.cs`** (Sprint 5.3)
- [ ] `CreateLiveInputAsync_NotConfigured_ReturnsMock` : sans token → IsMock=true + URL Mux test stream
- [ ] `GetLiveInputStatusAsync_NotConfigured_ReturnsMockIdle` : state="mock-idle"

**`Services/RedisCacheServiceTests.cs`** (Sprint 6.2)
- [ ] `NoOpCacheService_GetOrSetAsync_AlwaysCallsFactory` : pas de cache, factory toujours appelée
- [ ] `NoOpCacheService_GetAsync_ReturnsDefault` : null toujours
- [ ] `NoOpCacheService_HitsAndMisses_AreZero` : compteurs à 0

**`Services/SecurityHeadersMiddlewareTests.cs`** (Sprint 6.3)
- [ ] `Middleware_AddsAllSecurityHeaders` : 6 headers présents en response
- [ ] `Middleware_HangfireRoute_DoesNotAddXFrameOptions` : /hangfire exempté

---

## Phase B — API integration tests (curl-like via fetch)

### 4.4 Claude Vision
- [ ] `POST /api/progressphotos/{id}/analyze` body `{photoBase64}` → 200 + JSON `{analysis: {bodyFatEstimate, postureScore, ...}}`
- [ ] Erreur `404` si photoId inconnu
- [ ] Erreur `400` si photoBase64 absent

### 5.1 Feed social
- [ ] `POST /api/feed` body `{content: "Post normal"}` → 200, IsFlagged=false en DB
- [ ] `POST /api/feed` body `{content: "kys you piece of shit"}` → 200 mais **IsFlagged=true** en DB
- [ ] `GET /api/feed?page=2&pageSize=20` → 200 (infinite scroll endpoint)
- [ ] `POST /api/feed/upload-image` body `{photoBase64}` → 200 + `{imageUrl}` R2

### 5.2 Gym buddies
- [ ] `PUT /api/buddies/me` body profil → 200
- [ ] `GET /api/buddies/recommended?count=5` → 200 + liste triée par matchScore
- [ ] `POST /api/buddies/connect/{userId}` → 200 + status="Pending" OU "Accepted" si mutual
- [ ] `GET /api/buddies/pending` → 200 + liste demandes incoming

### 5.3 Live streaming
- [ ] `POST /api/lives` body `{title, type, scheduledAt}` (Admin) → 200 + Id
- [ ] `POST /api/lives/{id}/start-stream` → 200 + `{rtmpUrl, rtmpKey, hlsUrl, isMock}`
- [ ] `GET /api/lives/{id}/stream-status` → 200 + `{state, liveInputUid}`
- [ ] `POST /api/lives/webhook/cloudflare` body simulé → 200 + DB.Live.ReplayUrl mis à jour

### 5.4 Dashboard influenceur
- [ ] `GET /api/admin/influencer-analytics` (Admin) → 200 + `{kpi: {totalUsers, dau, mau, premiumUsers, conversionRate, monthRevenue, ...}, growthCurve, topRecipes, cityHeatmap}`
- [ ] Refusé `401`/`403` sans role Admin

### 6.1 Admin tech
- [ ] `GET /api/admin/tech/system-health` → 200 + `{uptime, workingSetMb, threadCount, db: {ok, latencyMs}}`
- [ ] `GET /api/admin/tech/users?q=yassine` → 200 + résultat search
- [ ] `POST /api/admin/tech/users/{id}/suspend` body `{suspend: true, reason: "test"}` → 200
- [ ] `GET /api/admin/tech/moderation-queue` → 200 + `{posts, comments, chatMessages}`
- [ ] `GET /api/admin/tech/ai-cost` → 200 + estimation messages × $0.003

### 6.2 Cache Redis
- [ ] `GET /api/admin/tech/cache-stats` → 200 + `{connected, hits, misses, hitRatioPercent}`
- [ ] `POST /api/admin/tech/cache/invalidate` body `{pattern: "exercises:*"}` → 200
- [ ] `GET /api/exercises` 2 appels successifs → 2ème devrait être cache hit (vérifier en stats)

### 6.3 Audit OWASP
- [ ] `GET /api/admin/security/audit` → 200 + 12 checks + 0 FAIL
- [ ] Headers HTTP : vérifier `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy` (sur /api routes)

---

## Phase C — DB checks (psql via docker)

- [ ] Table `BuddyProfiles` existe avec colonnes `Goals` (jsonb), `AvailableSlots` (jsonb)
- [ ] Table `BuddyConnections` avec UNIQUE composite (RequesterId, AddresseeId)
- [ ] Table `LiveChatMessages` existe avec colonnes modération (`IsFlagged`, `IsHidden`, `ToxicityScore`)
- [ ] Table `Lives` colonnes `CloudflareInputUid` + `RtmpKey` présentes
- [ ] Au moins 1 user avec `PushToken` non-null
- [ ] Au moins 1 photo `ProgressPhoto` avec `AiAnalysisJson` non-null après test 4.4

---

## Phase D — Playwright HEADED — Scenario navigation

### Préparation
- Backend port 5050 actif
- Expo web port 8082 actif
- Admin Next.js port 3000 actif (ou démarrer)

### Parcours mobile (Chrome `192.168.19.112:8082`) — 12 étapes

1. [ ] **Login** `yassine@gmail.com` / `Admin123!` → home avec carte programme visible
2. [ ] **Tab Communauté** → liste posts s'affiche, infinite scroll loader visible si plus de posts
3. [ ] **Compose post** : tap "+", écris "Test 5.1", choisis photo galerie, "Publier" → post avec photo
4. [ ] **Modération** : compose post avec mot toxique "fuck you piece of shit" → publié mais IsFlagged en DB
5. [ ] **Share post** : tap icône share sur un post → picker système (ou WhatsApp/clipboard fallback web)
6. [ ] **Tab Communauté → Gym Buddies** (icône people header) → écran cards matching
7. [ ] **Edit profil buddy** : settings → choisir Casablanca + 2 goals + 2 slots → Save → retour
8. [ ] **Connect buddy** : tap "Se connecter" sur 1 card → "Demande envoyée" alert
9. [ ] **Tab Lives** : liste lives, choisir un live → écran detail avec chat panel en bas
10. [ ] **Profil → Outils IA → Ma Progression** → tab Photos → bouton "Analyser avec IA 🤖"
11. [ ] **Claude Vision** : choisir photo galerie → spinner → modal avec body fat + posture + recommandation
12. [ ] **Logout** propre

### Parcours admin (Chrome `localhost:3000`) — 6 étapes

13. [ ] **Login admin** → /dashboard
14. [ ] Visiter **/influencer** → 8 KPI cards visibles (DAU/MAU/Premium/Revenus/Croissance/Séances/Lives/Heatmap)
15. [ ] **/monitoring** → System health card uptime > 0s, modération queue, gestion users
16. [ ] **Suspend user** : pick a test user → bouton Suspendre → modal raison → confirmé
17. [ ] **/security** → audit OWASP affiche 12 checks, 8+ OK, 0 FAIL
18. [ ] **Cache invalidate** : pas d'UI direct, mais bouton dans /monitoring si pressent

---

## Phase E — Smoke tests device (post-orchestration)

- [ ] Photo réelle analysée par Claude Vision (résultat cohérent)
- [ ] Modération réelle : un message contenant "I hate you" génère bien IsFlagged=true
- [ ] Buddy matching avec un autre compte test → demande reçue côté autre user
- [ ] WhatsApp share grocery list ouvre WhatsApp avec texte pré-rempli
- [ ] Push notif workout-reminders arrive si FCM creds OK (sinon skip)

---

## Critères de succès

| Phase | Score attendu |
|---|---|
| A xUnit backend | ✅ 100 % nouveaux tests |
| B API integration | ✅ ≥ 90 % (~22/24) |
| C DB checks | ✅ 6/6 |
| D Playwright HEADED | ✅ ≥ 15/18 (3 acceptables KO si seed manquant) |
| E Smoke device | ☐ 4-5 manuel post-test |

## Lancement (script orchestrateur)

```
node tests/run-sprint456-tests.mjs
```

Sort un rapport markdown `tests/SPRINT_456_TEST_RESULTS.md` avec ✅/❌ par check + chemin screenshots.

## Plan d'orchestration visuelle

| Heure | Étape |
|---|---|
| T+0 | Vérifier services up (backend, Expo, admin) |
| T+1 | Lance `node tests/run-sprint456-tests.mjs` |
| T+1-3 | Phase A xUnit (auto) |
| T+3-5 | Phase B API integration (auto via fetch) |
| T+5-7 | Phase C DB checks (auto via docker exec) |
| T+7-20 | Phase D Playwright HEADED — Yassine suit en live |
| T+20 | Génération `SPRINT_456_TEST_RESULTS.md` |
| T+20-25 | Phase E smoke device manuel |

Total estimé : **~25 min** pour validation complète des 8 sprints.
