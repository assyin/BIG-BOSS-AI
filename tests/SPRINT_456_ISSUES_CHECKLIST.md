# Checklist visuelle — Sprints 4.4 + 5.x + 6.x

> Cahier de route à cocher pendant l'orchestration Playwright HEADED.
> ✅ OK / ❌ KO / ⚠️ partiel + note.

Date orchestration : 2026-05-19 ___:___

---

## A — Backend xUnit (`dotnet test`)

### BuddyService (5.2)
- [ ] `GetRecommendedAsync_SameCity_ScoresHighest`
- [ ] `GetRecommendedAsync_SameGym_AddsExtra20`
- [ ] `GetRecommendedAsync_ExcludesAlreadyConnected`
- [ ] `RequestConnectionAsync_MutualMatch_AutoAccepts`
- [ ] `RequestConnectionAsync_SelfConnect_Throws`

### FeedService modération (5.1)
- [ ] `CreatePostAsync_ToxicContent_FlagsAutomatically`
- [ ] `CreatePostAsync_SafeContent_NotFlagged`
- [ ] `CommentAsync_ToxicComment_IsFlagged`

### CloudflareStreamService (5.3)
- [ ] `CreateLiveInputAsync_NotConfigured_ReturnsMock`
- [ ] `GetLiveInputStatusAsync_NotConfigured_ReturnsMockIdle`

### RedisCacheService / NoOp (6.2)
- [ ] `NoOpCacheService_GetOrSetAsync_AlwaysCallsFactory`
- [ ] `NoOpCacheService_HitsAndMisses_AreZero`

### SecurityHeadersMiddleware (6.3)
- [ ] `Middleware_AddsAllSecurityHeaders`
- [ ] `Middleware_HangfireRoute_DoesNotAddXFrameOptions`

---

## B — API integration

### 4.4 Claude Vision
- [ ] POST /api/progressphotos/{id}/analyze → 200 + JSON analysis
- [ ] 404 si photoId inconnu
- [ ] 400 si photoBase64 absent

### 5.1 Feed
- [ ] POST /api/feed normal → IsFlagged=false
- [ ] POST /api/feed toxic → IsFlagged=true
- [ ] GET /api/feed?page=2 → 200
- [ ] POST /api/feed/upload-image → 200 + imageUrl R2

### 5.2 Buddies
- [ ] PUT /api/buddies/me → 200
- [ ] GET /api/buddies/recommended → 200 trié
- [ ] POST /api/buddies/connect/{id} → 200
- [ ] GET /api/buddies/pending → 200

### 5.3 Lives
- [ ] POST /api/lives → 200
- [ ] POST /api/lives/{id}/start-stream → 200 + HLS URL
- [ ] GET /api/lives/{id}/stream-status → 200
- [ ] POST /api/lives/webhook/cloudflare simulé → 200 + ReplayUrl

### 5.4 Dashboard influenceur
- [ ] GET /api/admin/influencer-analytics → 200 + KPI
- [ ] 401/403 sans Admin role

### 6.1 Admin tech
- [ ] GET /api/admin/tech/system-health → 200
- [ ] GET /api/admin/tech/users?q=yassine → 200
- [ ] POST /api/admin/tech/users/{id}/suspend → 200
- [ ] GET /api/admin/tech/moderation-queue → 200
- [ ] GET /api/admin/tech/ai-cost → 200

### 6.2 Cache
- [ ] GET /api/admin/tech/cache-stats → 200 + hit ratio
- [ ] POST /api/admin/tech/cache/invalidate → 200
- [ ] 2ème GET /api/exercises → cache hit

### 6.3 Security
- [ ] GET /api/admin/security/audit → 200 + 12 checks + 0 FAIL
- [ ] Headers HSTS / X-Content-Type / X-Frame / CSP présents

---

## C — DB checks (psql)

- [ ] Table `BuddyProfiles` exists
- [ ] Table `BuddyConnections` exists avec UNIQUE composite
- [ ] Table `LiveChatMessages` exists avec colonnes modération
- [ ] Table `Lives.CloudflareInputUid` + `RtmpKey` colonnes
- [ ] User push_token non-null
- [ ] ProgressPhoto.AiAnalysisJson non-null après test 4.4

---

## D — Playwright HEADED

### Mobile (Chrome 192.168.19.112:8082)
- [ ] 1. Login yassine + carte programme visible
- [ ] 2. Tab Communauté → posts + infinite scroll
- [ ] 3. Compose post + photo → publié avec image
- [ ] 4. Post toxique → IsFlagged en DB (visible queue admin après)
- [ ] 5. Share post → picker/clipboard
- [ ] 6. Tab Communauté → Gym Buddies icône → écran cards
- [ ] 7. Edit profil buddy → Save retour
- [ ] 8. Connect buddy → alert demande envoyée
- [ ] 9. Tab Lives → detail avec chat panel
- [ ] 10. Profil → Ma Progression → tab Photos
- [ ] 11. Analyser avec IA → modal résultat
- [ ] 12. Logout

### Admin (Chrome localhost:3000)
- [ ] 13. Login admin → dashboard
- [ ] 14. /influencer → 8 KPI cards visibles
- [ ] 15. /monitoring → system health + queue
- [ ] 16. Suspend user test → confirmé
- [ ] 17. /security → audit 8+ OK · 0 FAIL
- [ ] 18. Cache invalidate (si UI)

---

## E — Smoke tests device

- [ ] Claude Vision photo réelle → analyse cohérente
- [ ] Modération message "I hate you" → IsFlagged
- [ ] Buddy matching cross-account
- [ ] WhatsApp share grocery list (skip si pas de programme)
- [ ] Push workout-reminders (skip si FCM creds manquants)

---

## Notes orchestration

| Étape KO | Reproduction | Hypothèse cause | Action |
|---|---|---|---|
| | | | |

## Bilan final

- **Total checks** : __/56
- **Score** : __ %
- **Bloqueurs P0** : ______________________
- **À reporter post-beta** : ______________________
- **Prêt pour beta launch** : ☐ oui  ☐ non
