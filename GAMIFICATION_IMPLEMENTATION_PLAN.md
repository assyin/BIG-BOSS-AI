# Big Boss Fitness — Plan d'Implementation Gamification
## Systeme de Points, Challenges, Recompenses, Affiliation

**Date**: 4 Avril 2026
**Estimation totale**: 8-12 semaines
**Status**: PLAN VALIDE — EN ATTENTE D'IMPLEMENTATION

---

## 1. ANALYSE DE L'EXISTANT

### Ce qui existe deja
- **Challenge entity** : CRUD basique (titre, description, type, dates, recompenses texte)
- **ChallengeService** : CRUD operations — leaderboard retourne des donnees vides (TODO)
- **User entity** : Profil riche mais ZERO champs gamification (pas de points, pas de streak, pas de code parrainage)
- **Session entity** : `CompletedAt`, `TotalVolumeKg`, `PersonalRecords` → sources principales pour les gains de points
- **Product entity** : Prix en MAD + gestion stock → reutilisable pour la boutique de points
- **Admin panel** : Page basique de gestion des challenges

### Ce qui manque TOTALEMENT
- Systeme de points (gains, depenses, solde, historique)
- Boutique de points / echange de recompenses
- Participation et progression aux challenges
- Systeme de streaks / achievements
- Programme d'affiliation / parrainage
- Dashboard admin pour configuration gamification

---

## 2. DECISIONS D'ARCHITECTURE

### 2.1 Points comme Ledger (Double-Entry Pattern)

Le systeme de points utilise un **ledger de transactions** plutot qu'un simple champ balance. Chaque changement de points cree une ligne immutable `PointTransaction`. Le solde est derive de `SUM(amount)` avec un **cache sur l'entite User** pour la performance en lecture.

**Pourquoi** : Audit trail complet, forensique anti-triche, operations de reversal/clawback, prevention des race conditions.

### 2.2 Regles de gains configurables via DB

Toutes les valeurs de gain de points (ex: "session complete = 50 pts", "bonus streak x1.5") sont stockees dans une table `GamificationConfig` cle-valeur, JAMAIS hardcodees. L'admin peut modifier sans redeploiement.

### 2.3 Cles d'idempotence pour l'anti-triche

Chaque evenement de gain de points porte une cle d'idempotence (ex: `session_complete:{sessionId}`) stockee comme contrainte unique sur `PointTransaction.IdempotencyKey`. Empeche les points dupliques.

### 2.4 Validation 100% cote serveur

Tous les calculs de points se font cote serveur. Le client mobile n'envoie JAMAIS "j'ai gagne X points" — il envoie "j'ai complete la session Y" et le serveur determine les points selon les donnees de session et la config actuelle.

### 2.5 Code d'affiliation auto-genere

Codes de parrainage : 8 caracteres alphanumeriques majuscules, uniques par utilisateur, generes a l'inscription ou a la premiere demande. Pas de codes choisis par l'utilisateur (vecteur de fraude).

---

## 3. SCHEMA BASE DE DONNEES — NOUVELLES ENTITES

### 3.1 PointTransaction (Le Ledger)

```
Table: point_transactions
- Id: Guid (PK)
- UserId: Guid (FK -> users)
- Amount: int (positif = gain, negatif = depense)
- Type: enum PointTransactionType
    (SessionComplete, ChallengeReward, StreakBonus, PRBonus,
     MacrosRespected, MealLogged, PhotoLogged, StatLogged,
     AffiliationReward, ShopPurchase, AdminAdjustment, Clawback,
     LiveWatched, FeedShared, ReviewPosted)
- Reason: string (ex: "Seance terminee: Chest Day")
- IdempotencyKey: string (unique, ex: "session_complete:abc-123")
- RelatedEntityId: Guid? (FK vers session/challenge/order)
- RelatedEntityType: string? ("Session", "Challenge", "ShopOrder")
- BalanceAfter: int (snapshot du solde apres cette transaction)
- CreatedAt: DateTime
- CreatedByAdminId: Guid? (uniquement pour AdminAdjustment/Clawback)
```

Index: `(UserId, CreatedAt DESC)`, `UNIQUE(IdempotencyKey)`, `(UserId, Type)`

### 3.2 Extensions User (nouvelles colonnes)

```
Nouvelles colonnes sur la table users:
- PointsBalance: int (default 0, cache agrege)
- CurrentStreak: int (default 0)
- LongestStreak: int (default 0)
- LastActivityDate: DateOnly? (pour calcul streak, UTC)
- ReferralCode: string (8 chars, unique, genere)
- ReferredByUserId: Guid? (FK -> users, nullable, set une fois a l'inscription)
- TotalPointsEarned: int (lifetime, ne diminue jamais)
- TotalPointsSpent: int (lifetime)
```

### 3.3 GamificationConfig

```
Table: gamification_configs
- Id: Guid (PK)
- Key: string (unique, ex: "points.session_complete")
- Value: string (JSON ou scalaire)
- Description: string (explication pour l'admin)
- Category: string ("points", "streak", "affiliation", "challenges", "shop")
- UpdatedAt: DateTime
- UpdatedByAdminId: Guid?
```

**Donnees de seed par defaut** :

| Cle | Valeur | Description |
|-----|--------|-------------|
| points.session_complete | 10 | Points par seance completee |
| points.session_min_duration | 15 | Duree min (minutes) pour valider |
| points.session_min_exercises | 3 | Exercices min pour valider |
| points.session_max_daily | 3 | Max seances recompensees/jour |
| points.streak_7d_bonus | 50 | Bonus 7 jours consecutifs |
| points.streak_30d_bonus | 300 | Bonus 30 jours |
| points.streak_100d_bonus | 1000 | Bonus 100 jours |
| points.pr_bonus | 30 | Bonus record personnel |
| points.macros_respected | 15 | Macros dans ±10% objectif |
| points.meal_logged | 5 | Premier log repas du jour |
| points.feed_shared | 5 | Partage resultat (1x/jour max) |
| points.review_posted | 50 | Avis 5 etoiles (1x/compte) |
| points.live_watched | 10 | Live regarde (80%+ du live) |
| points.daily_cap | 200 | Plafond journalier total |
| points.affiliation_referrer | 200 | Points pour le parrain |
| points.affiliation_referee | 50 | Points pour le filleul |
| points.challenge_completion | 500 | Points fin de challenge |
| streak.grace_period_hours | 36 | Tolerance streak (timezone) |
| affiliation.max_referrals_month | 20 | Max parrainages/mois |

### 3.4 ChallengeParticipation

```
Table: challenge_participations
- Id: Guid (PK)
- ChallengeId: Guid (FK -> challenges)
- UserId: Guid (FK -> users)
- JoinedAt: DateTime
- CurrentProgress: decimal (ex: kg total leve)
- IsCompleted: bool
- CompletedAt: DateTime?
- FinalRank: int?
- PointsAwarded: int
```

Contrainte unique: `(ChallengeId, UserId)`
Index: `(ChallengeId, CurrentProgress DESC)` pour le leaderboard

### 3.5 Challenge (extensions)

Nouvelles colonnes sur challenges:
```
- TargetValue: decimal? (objectif, ex: "lever 10000 kg total")
- PointsForCompletion: int
- PointsForParticipation: int
- PointsForTop3: int
- MaxParticipants: int? (null = illimite)
- RequiredSubscriptionTier: SubscriptionTier?
```

### 3.6 Achievement

```
Table: achievements
- Id: Guid (PK)
- Key: string (unique, ex: "first_session", "streak_30")
- Title: string
- Description: string
- IconUrl: string?
- Category: enum (Consistency, Strength, Volume, Social, Milestone)
- Condition: string (JSON, ex: {"type":"streak","value":30})
- PointsReward: int
- IsActive: bool
- SortOrder: int
- CreatedAt: DateTime
```

### 3.7 UserAchievement

```
Table: user_achievements
- Id: Guid (PK)
- UserId: Guid (FK)
- AchievementId: Guid (FK)
- UnlockedAt: DateTime
- PointsAwarded: int
```

Contrainte unique: `(UserId, AchievementId)`

### 3.8 ShopReward

```
Table: shop_rewards
- Id: Guid (PK)
- Title: string
- Description: string
- ImageUrl: string?
- Category: enum (Discount, PhysicalProduct, DigitalReward, Subscription, Experience)
- PointsCost: int
- RealValueMad: decimal? (valeur reelle pour reference admin)
- Stock: int? (null = illimite)
- MaxPerUser: int? (null = illimite)
- RequiredSubscriptionTier: SubscriptionTier?
- IsActive: bool
- IsFeatured: bool
- ValidFrom: DateTime?
- ValidUntil: DateTime?
- RedemptionInstructions: string?
- CreatedAt, UpdatedAt: DateTime
```

### 3.9 RewardRedemption

```
Table: reward_redemptions
- Id: Guid (PK)
- UserId: Guid (FK)
- ShopRewardId: Guid (FK)
- PointsSpent: int
- Status: enum (Pending, Confirmed, Shipped, Delivered, Cancelled, Refunded)
- RedemptionCode: string? (code voucher auto-genere)
- ShippingAddress: string? (JSON, pour produits physiques)
- AdminNotes: string?
- CreatedAt, UpdatedAt, ProcessedAt: DateTime
- ProcessedByAdminId: Guid?
```

### 3.10 AffiliationEvent

```
Table: affiliation_events
- Id: Guid (PK)
- ReferrerId: Guid (FK -> users, parrain)
- RefereeId: Guid (FK -> users, filleul)
- ReferralCode: string
- EventType: enum (Registration, FirstSession, SubscriptionPurchase)
- PointsAwarded: int
- CreatedAt: DateTime
- IpAddress: string? (detection fraude)
- DeviceFingerprint: string? (detection fraude)
```

Contrainte unique: `(ReferrerId, RefereeId, EventType)`

---

## 4. ENDPOINTS API

### 4.1 Points (`/api/points`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/points/balance | User | Solde + stats lifetime |
| GET | /api/points/history | User | Historique pagine avec filtres |
| GET | /api/points/summary | User | Ventilation mensuelle par categorie |

### 4.2 Boutique (`/api/shop`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/shop/rewards | User | Liste recompenses disponibles |
| GET | /api/shop/rewards/{id} | User | Detail recompense |
| POST | /api/shop/redeem | User | Echanger des points |
| GET | /api/shop/redemptions | User | Historique echanges |

### 4.3 Challenges (extension `/api/challenges`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | /api/challenges/{id}/join | User | Rejoindre un challenge |
| POST | /api/challenges/{id}/leave | User | Quitter (avant debut) |
| GET | /api/challenges/{id}/my-progress | User | Ma progression |
| GET | /api/challenges/{id}/leaderboard | User | Classement (deja existe, a implementer) |
| GET | /api/challenges/my-challenges | User | Mes challenges actifs |

### 4.4 Achievements (`/api/achievements`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/achievements | User | Tous les achievements (avec statut unlock) |
| GET | /api/achievements/unlocked | User | Mes achievements debloquees |

### 4.5 Streak (`/api/streak`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/streak | User | Streak actuel + calendrier |
| GET | /api/streak/calendar | User | Heatmap mensuel |

### 4.6 Affiliation (`/api/affiliation`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/affiliation/my-code | User | Mon code (genere si inexistant) |
| GET | /api/affiliation/stats | User | Stats parrainage |
| GET | /api/affiliation/referrals | User | Liste filleuls |
| POST | /api/auth/register | Public | **Extension** : accepter `referralCode` optionnel |

### 4.7 Admin Gamification (`/api/admin/gamification`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/admin/gamification/config | Admin | Toutes les configs |
| PUT | /api/admin/gamification/config/{key} | Admin | Modifier une config |
| GET | /api/admin/gamification/stats | Admin | Dashboard stats globales |
| GET | /api/admin/points/transactions | Admin | Explorer les transactions |
| POST | /api/admin/points/adjust | Admin | Ajustement manuel |
| POST | /api/admin/points/clawback | Admin | Reverser des points frauduleux |
| CRUD | /api/admin/shop/rewards | Admin | Gestion recompenses |
| GET | /api/admin/shop/redemptions | Admin | File d'attente echanges |
| PUT | /api/admin/shop/redemptions/{id}/status | Admin | Workflow de statut |
| CRUD | /api/admin/achievements | Admin | Gestion achievements |
| GET | /api/admin/affiliation/overview | Admin | Stats programme affiliation |
| GET | /api/admin/affiliation/suspicious | Admin | Parrainages suspects |

---

## 5. ANTI-TRICHE ET PREVENTION DE FRAUDE

### 5.1 Anti-triche Points

**Prevention doublons** :
- Chaque gain a une `IdempotencyKey` unique avec contrainte DB. Meme si l'endpoint est appele 100 fois, une seule transaction est creee.

**Rate limiting** :
- Plafond journalier par categorie (configurable via `GamificationConfig`)
- Plafond journalier global : 200 pts max/jour/user (configurable)
- Enforce cote serveur par comptage des transactions du jour

**Validation session** :
- Points uniquement si `Status == Completed`, `ActualDurationMinutes >= 15`, `TotalSets >= 1`
- Si > 5 sessions en 24h → flag pour review, points en attente
- Verification gap temporel entre sessions

**Integrite solde** :
- `BalanceAfter` calcule cote serveur dans une transaction DB avec `SELECT ... FOR UPDATE` (pessimistic locking)
- Job nightly de reconciliation : `SUM(amount)` doit etre egal a `User.PointsBalance`. Divergences → alerte admin.

### 5.2 Fraude Affiliation

**Detection meme appareil** :
- Stocker fingerprint appareil + IP a l'inscription
- Si parrain et filleul partagent meme fingerprint ou IP → flag suspect, points retenus

**Controle de velocite** :
- Si > 5 parrainages en 24h → pause des recompenses + flag pour review

**Detection comptes fantomes** :
- Points parrain en 2 etapes :
  1. Immediat : 25 pts a l'inscription du filleul
  2. Differe : 175 pts quand le filleul complete sa 1ere seance reelle
- Empeche la creation massive de comptes jetables

**Mecanisme de clawback** :
- L'admin peut emettre une transaction `Clawback` qui annule les points frauduleux, referencant la transaction originale.

### 5.3 Anti-abus Boutique

- `PointsBalance >= PointsCost` verifie dans une transaction DB
- `MaxPerUser` enforce par comptage des redemptions existantes
- Redemptions haute valeur (>5000 pts) → validation admin requise (status Pending)
- Cooldown : meme recompense pas disponible dans les N heures (configurable)
- Stock: `UPDATE SET stock = stock - 1 WHERE stock > 0` (concurrence optimiste, 409 si epuise)

---

## 6. EDGE CASES ET SCENARIOS

### 6.1 Streak et fuseaux horaires
- **Grace period de 36h** au lieu de minuit strict
- Un user qui s'entraine a 23h un jour et 11h le surlendemain (36h gap) perd son streak
- Un user qui s'entraine tard un jour et tot le lendemain le garde
- Configurable par l'admin

### 6.2 Race condition a minuit
- Les mises a jour de streak se font DANS la transaction de completion de session
- Pas de cron job separe pour le streak → pas de race condition
- Un background job ne sert que pour les bonus de milestone (7j, 30j, 100j)

### 6.3 Challenge qui se termine pendant une session
- Grace period de 1h apres `EndDate`
- Progres soumis dans cette fenetre compte encore
- Apres la grace period, background job finalise les classements et distribue les points

### 6.4 Solde qui passe en negatif
- Prevention : toujours verifier `Balance >= cost` dans une transaction serializable
- Si bug cause un solde negatif, le job de reconciliation le detecte → alerte admin
- Pas de correction automatique → review humaine requise

### 6.5 Stock epuise pendant la redemption
- Concurrence optimiste : `UPDATE SET stock = stock - 1 WHERE stock > 0`
- Si affected rows = 0 → retourner 409 Conflict "Rupture de stock"

### 6.6 Suppression de compte
- `PointTransactions` : soft-delete + anonymisation (garde pour audit)
- `ChallengeParticipation` : reste avec user anonymise (integrite leaderboard)
- `RewardRedemptions` en Pending → auto-annulees, points rembourses avant suppression

---

## 7. ECRANS FRONTEND MOBILE

### Nouvelles routes Expo Router

| Route | Description |
|-------|-------------|
| `(main)/rewards/index.tsx` | Boutique de points — grille recompenses, categories, solde |
| `(main)/rewards/[id].tsx` | Detail recompense + bouton echanger |
| `(main)/rewards/history.tsx` | Historique echanges |
| `(main)/challenges/index.tsx` | Liste challenges (actifs, a venir, passes) |
| `(main)/challenges/[id].tsx` | Detail challenge + leaderboard + rejoindre |
| `(main)/challenges/my-challenges.tsx` | Mes challenges actifs |
| `(main)/achievements/index.tsx` | Galerie achievements (lock/unlock) |
| `(main)/affiliation/index.tsx` | Ecran parrainage (code, partager, stats) |
| `(main)/points/history.tsx` | Historique complet des transactions |

### Enhancements ecrans existants

**Home (index.tsx)** :
- Widget solde de points (en haut)
- Indicateur streak avec flamme
- Cartes challenges actifs (scroll horizontal)
- Banner notification achievement debloque

**Profil (profile.tsx)** :
- Affichage solde de points
- Stats streak
- Lien galerie achievements
- Lien ecran parrainage
- Lien historique echanges

### Nouveaux Zustand Stores

| Store | State |
|-------|-------|
| `gamification.store.ts` | pointsBalance, currentStreak, longestStreak, recentAchievements |
| `shop.store.ts` | rewards[], redemptions[], selectedReward |
| `challenges.store.ts` | activeChallenges[], myChallenges[], leaderboard |

### Nouveaux Services API

| Service | Responsabilites |
|---------|-----------------|
| `points.service.ts` | Balance, historique, summary |
| `shop.service.ts` | Liste recompenses, redemption |
| `challenges.service.ts` | Rejoindre, quitter, progression, leaderboard |
| `achievements.service.ts` | Liste tous, liste debloquees |
| `affiliation.service.ts` | Code, stats, liste filleuls |

---

## 8. DASHBOARD ADMIN (Next.js)

### Nouvelles pages admin

| Route | Description |
|-------|-------------|
| /admin/gamification | Dashboard overview : points en circulation, challenges actifs, file redemptions |
| /admin/gamification/config | Editeur de config : table cle-valeur, edition inline, onglets par categorie |
| /admin/gamification/points | Explorateur points : recherche par user, filtre par type, ajustement manuel |
| /admin/shop | Gestion recompenses : CRUD, stock, featured |
| /admin/shop/redemptions | File d'attente echanges : workflow statut (Pending → Confirmed → Shipped → Delivered) |
| /admin/achievements | Gestion achievements : CRUD, reorder, toggle actif |
| /admin/affiliation | Dashboard affiliation : top parrains, taux conversion, alertes suspectes |
| /admin/affiliation/suspicious | Parrainages flagges : IP partagee, velocite, boutons approuver/rejeter/bannir |

### Enhancement page Challenges existante
- Ajouter champs : TargetValue, PointsForCompletion, PointsForParticipation, PointsForTop3
- Afficher nombre de participants et preview leaderboard
- Bouton "Finaliser Challenge" (declenche classement + distribution points)

---

## 9. PHASES D'IMPLEMENTATION

### Phase 1 : Fondation Points (2-3 semaines)

**Backend :**
1. Creer entites : `PointTransaction`, `GamificationConfig`
2. Ajouter champs User (PointsBalance, streak, ReferralCode)
3. Configurations EF + migration
4. Implementer `IGamificationConfigService` avec cache memoire
5. Implementer `IPointsService` (AwardPoints, SpendPoints, GetBalance, GetHistory)
6. Implementer `IStreakService`
7. Integrer dans `SessionService.CompleteSessionAsync`
8. Seed `GamificationConfig` avec valeurs par defaut
9. Creer `PointsController` et `StreakController`

**Admin :**
10. Page `/admin/gamification/config`
11. Page `/admin/gamification/points` avec ajustement manuel

**Mobile :**
12. Creer `points.service.ts` et `gamification.store.ts`
13. Widget points + streak sur Home
14. Ecran `points/history.tsx`

### Phase 2 : Challenges ameliores (1.5-2 semaines)

**Backend :**
1. Creer `ChallengeParticipation` + migration
2. Ajouter champs a `Challenge`
3. Implementer `IChallengeParticipationService`
4. Implementer vrai leaderboard
5. Integrer progression dans completion session
6. Background job finalisation challenges
7. Nouveaux endpoints `ChallengesController`

**Admin :**
8. Ameliorer formulaire challenge
9. Vue participants/leaderboard
10. Action finalisation

**Mobile :**
11. Ecrans challenges (liste, detail, mes challenges)
12. Cartes challenges sur Home

### Phase 3 : Boutique de points (1.5-2 semaines)

**Backend :**
1. Creer `ShopReward` + `RewardRedemption` + migration
2. Implementer `IShopService`
3. `ShopController` + `AdminShopController`
4. Gestion stock concurrence optimiste
5. Workflow redemption

**Admin :**
6. Pages `/admin/shop` (CRUD, file redemptions)
7. UI workflow statut

**Mobile :**
8. Ecrans boutique (liste, detail, redemption)
9. Historique echanges

### Phase 4 : Achievements (1-1.5 semaines)

**Backend :**
1. Creer `Achievement` + `UserAchievement` + migration
2. Implementer `IAchievementService` avec moteur d'evaluation
3. Integrer checks achievements dans chaque gain de points
4. `AchievementsController`
5. Seed achievements initiaux

**Admin :**
6. Page `/admin/achievements`

**Mobile :**
7. Galerie achievements
8. Notifications unlock

### Phase 5 : Systeme d'affiliation (1.5-2 semaines)

**Backend :**
1. Creer `AffiliationEvent` + migration
2. Implementer `IAffiliationService` avec detection fraude
3. Modifier `AuthService.RegisterAsync` pour accepter referralCode
4. Generer codes pour users existants
5. `AffiliationController`
6. Logique recompense differee

**Admin :**
7. Dashboard `/admin/affiliation`
8. Page review activite suspecte

**Mobile :**
9. Ecran parrainage avec partage (deep linking)
10. Champ code parrainage dans inscription

### Phase 6 : Polish et optimisation (1 semaine)

1. Push notifications : achievement unlock, streak en danger, challenge fin proche, reward shipped
2. Job nightly reconciliation
3. Optimisation performance (Redis si necessaire)
4. Analytics engagement gamification
5. Tests end-to-end
6. Tests de charge (redemptions concurrentes)

---

## 10. POINTS D'INTEGRATION

Les services existants doivent declencher la gamification :

| Service existant | Declencheur | Action gamification |
|-----------------|-------------|---------------------|
| `SessionService.CompleteSessionAsync` | Seance terminee | AwardPoints + UpdateStreak + UpdateChallengeProgress + CheckAchievements |
| `NutritionService.LogMealAsync` | Repas logge | AwardPoints (1er du jour) |
| `BodyStatService.CreateAsync` | Mesure ajoutee | AwardPoints |
| `ProgressPhotoService.UploadAsync` | Photo ajoutee | AwardPoints |
| `AuthService.RegisterAsync` | Inscription | ProcessReferral (si code fourni) |
| `ProgrammeService.CompleteProgrammeSessionAsync` | Session programme | AwardPoints + UpdateChallengeProgress |

---

## 11. RISQUES ET MITIGATIONS

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Inflation points (trop facile a gagner) | Devalue recompenses | Valeurs configurables par admin; commencer conservateur; monitoring dashboard |
| Fraude sessions fake | Points gonfles | Validation serveur: duree min, sets min, rate limits, plafond journalier |
| Farming parrainage (auto-parrainage) | Points gratuits | Fingerprint + IP check, recompenses differees, limite velocite |
| Race condition sur solde | Solde negatif, double-spend | Transaction serializable + SELECT FOR UPDATE, reconciliation nightly |
| Performance leaderboard | Pages lentes | Requete indexee suffisante Phase 1; Redis sorted sets comme echappatoire |
| Survente stock recompenses | Users mecontents | Concurrence optimiste UPDATE WHERE stock > 0 |
| Confusion streak timezone | Frustration user | Grace period 36h par defaut, UI claire "entraine-toi avant X pour garder le streak" |

---

## 12. STRATEGIE DE MIGRATION

Tout est additif (pas de breaking changes sauf ajout colonnes User) :

1. **Migration 1** (Phase 1) : Colonnes users + tables point_transactions + gamification_configs
2. **Migration 2** (Phase 2) : Table challenge_participations + colonnes challenges
3. **Migration 3** (Phase 3) : Tables shop_rewards + reward_redemptions
4. **Migration 4** (Phase 4) : Tables achievements + user_achievements
5. **Migration 5** (Phase 5) : Table affiliation_events + colonne referral_code users

Chaque migration est deployable independamment. Le systeme fonctionne sans donnees de gamification — les fonctionnalites existantes ne sont pas impactees.

---

## 13. FICHIERS CRITIQUES POUR L'IMPLEMENTATION

**Backend :**
- `BigBoss.Core/Entities/User.cs` → doit etre etendu avec points/streak/referral
- `BigBoss.Infrastructure/Services/ChallengeService.cs` → participation + vrai leaderboard
- `BigBoss.Infrastructure/Data/BigBossDbContext.cs` → enregistrer tous les nouveaux DbSets
- `BigBoss.Infrastructure/Services/SessionService.cs` → integrer gamification dans completion

**Mobile :**
- `mobile/src/constants/api.ts` → ajouter tous les nouveaux endpoints
- `mobile/src/app/(main)/index.tsx` → integrer widgets points/streak/challenges

**Admin :**
- `admin/src/app/challenges/page.tsx` → ameliorer avec nouveaux champs gamification
