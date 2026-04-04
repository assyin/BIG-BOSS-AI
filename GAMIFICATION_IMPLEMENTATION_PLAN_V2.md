# Big Boss Fitness — Plan d'Implementation Gamification V2
## Systeme Complet : Points, Challenges, Recompenses, Affiliation, Admin Dashboard

**Date**: 4 Avril 2026
**Estimation totale**: 14-18 semaines (spec etendue avec admin complet)
**Status**: PLAN V2 — SPEC COMPLETE

---

## TABLE DES MATIERES

1. Analyse de l'existant
2. Decisions d'architecture
3. Schema base de donnees (14 nouvelles entites)
4. Systeme de points (Module 1)
5. Challenges avances (Module 2)
6. Boutique de points (Module 3)
7. Achievements / Badges (Module 4)
8. Affiliation (Module 5)
9. Streaks (Module 6)
10. Anti-triche (Module 7)
11. Dashboard Admin complet (Sections A-K)
12. Roles admin et audit
13. Endpoints API complets (~80 endpoints)
14. Contraintes techniques
15. Ecrans mobile
16. Phases d'implementation (8 phases)
17. Risques et mitigations

---

## 1. ANALYSE DE L'EXISTANT

### Ce qui existe
- Challenge entity : CRUD basique (titre, description, type, dates)
- ChallengeService : leaderboard vide (TODO)
- User entity : profil riche, ZERO gamification
- Session entity : CompletedAt, TotalVolumeKg, PersonalRecords
- Product entity : prix MAD + stock
- Admin panel : pages basiques challenges/exercices/recettes
- 70 endpoints API backend, 30+ ecrans mobile

### Ce qui manque TOTALEMENT
- Points, boutique, achievements, streaks, affiliation
- Dashboard admin complet (sections A-K)
- Roles admin + audit log
- Anti-triche
- Notifications push
- Feature flags
- Monitoring technique
- Finance/revenus

---

## 2. DECISIONS D'ARCHITECTURE

### 2.1 Ledger de points immutable
Chaque changement de points = ligne immutable `PointTransaction`. Balance cachee sur User pour perf lecture. Audit trail complet.

### 2.2 Config 100% en DB
Table `GamificationConfig` cle-valeur. Cache memoire 5 min. Invalidation immediate quand admin modifie. JAMAIS de hardcode.

### 2.3 Idempotence anti-doublon
Chaque gain a une `IdempotencyKey` unique (contrainte DB). Ex: `session_complete:{sessionId}`.

### 2.4 Validation 100% serveur
Le client n'envoie jamais "j'ai gagne X points". Il envoie "j'ai fait Y" et le serveur calcule.

### 2.5 Admin JWT separe
JWT admin separe du JWT user. Session 2h. 2FA obligatoire SuperAdmin. Toutes actions loguees.

### 2.6 SignalR temps reel
Dashboard admin utilise SignalR pour metriques temps reel (sans refresh).

### 2.7 Cache Redis
- Classements : Redis sorted sets (TTL configurable, defaut 5 min)
- Config : cache Redis (TTL 1h, invalidation on update)
- Leaderboard recalcule toutes les 60 min via cron job

### 2.8 Background jobs
- Exports CSV en background → email avec lien telechargement
- Recalcul scores challenges : cron 60 min
- Reconciliation points : nightly
- Anti-triche validations : async background

---

## 3. SCHEMA BASE DE DONNEES

### 3.1 PointTransaction (Ledger)
```
point_transactions:
  Id, UserId, Amount (int, +/-), Type (enum), Reason (string),
  IdempotencyKey (unique), RelatedEntityId, RelatedEntityType,
  BalanceAfter (int), CreatedAt, CreatedByAdminId
```

### 3.2 User (extensions)
```
Nouvelles colonnes users:
  PointsBalance, CurrentStreak, LongestStreak, LastActivityDate,
  ReferralCode (unique 8 chars), ReferredByUserId,
  TotalPointsEarned, TotalPointsSpent,
  SubscriptionTier (Free/Premium/Elite), SubscriptionExpiry,
  IsSuspended, SuspendedReason, City
```

### 3.3 GamificationConfig
```
gamification_configs:
  Id, Key (unique), Value (string/JSON), Description,
  Category, UpdatedAt, UpdatedByAdminId
```

### 3.4 ChallengeParticipation
```
challenge_participations:
  Id, ChallengeId, UserId (unique pair), JoinedAt,
  CurrentProgress (decimal), IsCompleted, CompletedAt,
  FinalRank, PointsAwarded, IsDisqualified, DisqualifyReason
```

### 3.5 Challenge (extensions)
```
Nouvelles colonnes:
  TargetValue, MetricType (Volume/Sessions/Streak/Calories/etc),
  PointsForCompletion, PointsForParticipation, PointsForTop3,
  MaxParticipants, RequiredSubscriptionTier,
  PhotoCheckinRequired, PhotoCheckinIntervalDays,
  ChallengeType (Monthly/Instant/CityVsCity/Annual),
  TitleAr, DescriptionAr, IsVisibleToFree
```

### 3.6 ChallengeReward
```
challenge_rewards:
  Id, ChallengeId, RankFrom, RankTo,
  RewardType (Cash/Premium/Elite/Product/Coaching/Points),
  RewardValue, Description, BonusPoints
```

### 3.7 ShopReward
```
shop_rewards:
  Id, Title, Description, ImageUrl,
  Category (Discount/Physical/Digital/Subscription/Experience),
  PointsCost, RealValueMad, Stock, MaxPerUser,
  RequiredSubscriptionTier, IsActive, IsFeatured,
  ValidFrom, ValidUntil, RedemptionInstructions,
  CreatedAt, UpdatedAt
```

### 3.8 RewardRedemption
```
reward_redemptions:
  Id, UserId, ShopRewardId, PointsSpent,
  Status (Pending/Confirmed/Shipped/Delivered/Cancelled/Refunded),
  RedemptionCode, ShippingAddress (JSON),
  AdminNotes, CreatedAt, UpdatedAt, ProcessedAt, ProcessedByAdminId
```

### 3.9 Achievement (Badge)
```
achievements:
  Id, Key (unique), Title, TitleAr, Description, DescriptionAr,
  IconUrl, Category (Consistency/Strength/Volume/Social/Milestone),
  TriggerType, TriggerValue, PointsReward,
  IsActive, SortOrder, CreatedAt
```

### 3.10 UserAchievement
```
user_achievements:
  Id, UserId, AchievementId (unique pair),
  UnlockedAt, PointsAwarded
```

### 3.11 AffiliationEvent
```
affiliation_events:
  Id, ReferrerId, RefereeId, ReferralCode,
  EventType (Registration/FirstSession/SubscriptionPurchase),
  PointsAwarded, CreatedAt, IpAddress, DeviceFingerprint
```

### 3.12 AffiliateProfile
```
affiliate_profiles:
  Id, UserId, Level (Bronze/Silver/Gold/Ambassador),
  TotalReferrals, ActiveReferrals,
  TotalEarnings (decimal MAD), PendingEarnings,
  AvailableForWithdrawal, CommissionPercent,
  BankName, BankAccount (AES-256 encrypted), CreatedAt
```

### 3.13 WithdrawalRequest
```
withdrawal_requests:
  Id, UserId, Amount (decimal 18,2), Method,
  BankAccount, Status (Pending/Processing/Completed/Rejected),
  AdminNotes, RejectReason, CreatedAt, ProcessedAt, ProcessedByAdminId
```

### 3.14 AdminUser + AdminAuditLog
```
admin_users:
  Id, Email, PasswordHash, Role (SuperAdmin/ContentManager/SupportAgent/FinanceManager/ReadOnly),
  IsActive, LastLoginAt, LastLoginIp, TwoFactorEnabled

admin_audit_logs:
  Id, AdminId, Action, EntityType, EntityId,
  OldValueJson, NewValueJson, IpAddress, CreatedAt
```

### 3.15 NotificationTemplate
```
notification_templates:
  Id, TriggerKey (unique), TitleFr, TitleAr, BodyFr, BodyAr,
  IsActive, WithCoachVoice, TotalSent, OpenRate, CreatedAt
```

### 3.16 FeatureFlag
```
feature_flags:
  Id, Key (unique), IsEnabled, Description, UpdatedAt, UpdatedByAdminId
```

Flags par defaut: coach_vocal, vision_posture, scan_repas, challenges, affiliation, feed_communaute, live_streaming, boutique

### 3.17 AppConfig
```
app_configs:
  Id, Key (unique), Value, Category (plans/limits/content/maintenance),
  Description, UpdatedAt, UpdatedByAdminId
```

---

## 4. TABLE DE GAINS DE POINTS

| Action | Points | Validation |
|--------|--------|------------|
| Seance completee | +10 | Duree >= 15 min + >= 3 exercices logges |
| 7 jours consecutifs | +50 bonus | Streak non casse 7 jours |
| PR battu | +30 | Charge > historique 90 jours meme exercice |
| Macros respectes (jour) | +15 | Calories ±10% objectif + 3 repas logges |
| Partager resultat (feed) | +5 | 1x/jour max |
| Parrainer ami actif | +200 | Ami complete min 1 seance dans 7 jours |
| Avis 5 etoiles | +50 | 1x/compte a vie |
| Live regarde complet | +10 | 80%+ du live regarde |
| Challenge mensuel complete | +500 | Selon criteres challenge |
| Premier log repas du jour | +5 | 1x/jour |
| Streak 30 jours | +300 bonus | Milestone auto |
| Streak 100 jours | +1000 bonus | Milestone auto |

**Plafond journalier**: 200 pts (configurable)
**Toutes valeurs configurables par admin sans redeploiement**

---

## 5. BOUTIQUE DE POINTS

| Recompense | Cout | Stock | Conditions |
|------------|------|-------|------------|
| Shaker Big Boss | 500 pts | Limite | 1x/user |
| 1 mois Premium | 1000 pts | Illimite | Pas si deja Premium |
| T-shirt Big Boss | 2000 pts | Limite | 1x/user |
| Session coaching 1-to-1 30min | 5000 pts | 10/mois | Sur RDV |
| Reduction 20% boutique 7j | 300 pts | Illimite | 1 coupon actif max |

---

## 6. ANTI-TRICHE COMPLET

### 6.1 Config anti-triche (tous parametres configurables)
- Session min duree : 15 min
- Session min exercices : 3
- Max sessions/jour recompensees : 3
- Plafond points/jour : 200
- Grace period streak : 36h
- Max parrainages/mois : 20
- Seuil validation admin redemption : 5000 pts
- Cooldown meme recompense : 24h
- Max referrals meme IP : 2
- Velocity check referrals : 5/24h

### 6.2 Detection automatique
- Sessions < 15 min ou 0 sets → 0 points
- > 5 sessions/24h → flag review
- Parrain + filleul meme IP/fingerprint → flag suspect
- > 5 parrainages/24h → pause recompenses
- Points parrain en 2 etapes (25 pts immediat, 175 pts apres 1ere seance filleul)

### 6.3 Actions admin
- Innocenter / Disqualifier / Bannir
- Clawback (reversal points frauduleux)
- Score de suspicion par user

---

## 7. DASHBOARD ADMIN COMPLET

### SECTION A — Tableau de bord principal

**Utilisateurs** :
- Total inscrits (Free + Premium + Elite)
- Nouveaux aujourd'hui / semaine / mois
- DAU (actifs aujourd'hui)
- MAU (actifs ce mois)
- Taux conversion Free → Premium (%)
- Retention 30 jours (%)
- Churn rate mensuel (%)

**Revenus** :
- MRR en MAD
- Revenu aujourd'hui / semaine / mois
- Comparaison vs mois precedent (+/- %)
- Projection fin de mois

**Engagement** :
- Seances completees aujourd'hui
- Repas logges aujourd'hui
- Messages coach IA aujourd'hui
- Lives en cours + spectateurs
- Challenges actifs + participants

**Technique** :
- Statut APIs (Claude, OpenAI, ElevenLabs, Cloudflare) : OK/Degrade/Down
- Cout API AI jour/mois en MAD
- Uptime serveur (%)
- Latence API moyenne (ms)
- Taux erreur API (%)

### SECTION B — Gestion Utilisateurs
- Liste complete avec filtres (plan, ville, date inscription, actif/inactif, signale)
- Recherche par nom, email, telephone, code parrainage
- Pour chaque user : profil, paiements, points, streak, badges, challenges, parrainages, logs activite, anti-triche
- Actions : Suspendre, Changer plan, Ajouter/Retirer points (motif obligatoire), Reset password, Notification perso, Rembourser

### SECTION C — Gestion Challenges
- Liste tous challenges (passes/actifs/a venir)
- Par challenge : participants, graphe evolution, top 10, leaderboard complet, flags anti-triche
- Actions : Modifier, Arreter, Disqualifier participant (motif), Distribuer recompenses, Export CSV
- Formulaire creation : Titre FR/AR, Description FR/AR, Type, Metrique, Dates, Max participants, Visible Free, Plan min, Photo check-in, Recompenses par rang, Notification lancement

### SECTION D — Config Points et Recompenses
- Tableau tous les PointActionType avec valeurs modifiables inline
- Activer/desactiver chaque action
- Limite journaliere configurable
- Historique modifications (qui/quand/quoi)
- Tableau recompenses boutique : CRUD inline, stats utilisation

### SECTION E — Config Anti-Triche
- Formulaire tous les parametres AntiCheatConfig
- Description impact chaque parametre
- Historique modifications
- Liste users flagges (aujourd'hui/semaine/en attente)
- Actions : Innocenter / Disqualifier / Bannir

### SECTION F — Gestion Affiliation
- Config generale : formulaire AffiliateConfig complet
- Liste affilies : pseudo, niveau, parrainages, gains totaux/en attente/disponible
- Demandes retrait : liste, detail, Approuver/Rejeter (motif), Export CSV bancaire
- Stats : commissions payees, nouveaux inscrits via parrainage, taux conversion, top 10

### SECTION G — Notifications
- Templates : trigger, titre, corps FR/AR, actif/inactif, modifier, tester, historique envois
- Envoi manuel : cible (tous/Premium/Elite/Free/ville/user ID), titre+corps FR/AR, voix coach, planifier, preview, confirmation

### SECTION H — Badges
- Liste : code, nom, categorie, condition, stats (combien d'users)
- CRUD + activer/desactiver
- Attribution manuelle (recherche user + select badge + motif)
- Option attribution retroactive

### SECTION I — Revenus et Finances
- MRR evolution 12 mois graphe
- Revenu par plan (Free ads/Premium/Elite/B2B)
- Boutique + coaching
- Commissions affiliation payees
- Couts API AI
- Marge brute estimee
- Transactions : liste complete, filtres, export CSV
- Abonnements : nouveaux/jour graphe, churn/jour graphe, acquisition vs churn

### SECTION J — Logs et Monitoring
- Logs temps reel : 100 dernieres erreurs, logs Claude/OpenAI/ElevenLabs (cout, tokens, latence)
- Graphes : latence P50/P95/P99, taux erreur, requetes/min
- Alertes configurables : email si erreur > X%
- Couts API temps reel : Claude/GPT-4o/ElevenLabs, tokens, projection fin mois, alerte seuil

### SECTION K — Config Globale
- Plans et tarifs : prix Premium/Elite mensuel/annuel MAD, essai gratuit, features par plan
- Limites par plan : messages coach/jour, scans repas/jour, exercices accessibles
- Contenu : message bienvenue FR/AR, motivation du jour, FAQ, CGU, confidentialite
- Maintenance : mode on/off, message FR/AR, IPs whitelistees, version min app
- Feature flags : toggles pour chaque fonctionnalite (coach vocal, vision, scan, challenges, affiliation, feed, live, boutique)

---

## 8. ROLES ADMIN

| Role | Acces |
|------|-------|
| SuperAdmin | Tout + gestion admins + 2FA obligatoire |
| ContentManager | Challenges, badges, notifications, contenu |
| SupportAgent | Utilisateurs, remboursements, logs |
| FinanceManager | Revenus, affiliation, retraits |
| ReadOnly | Tout voir, rien modifier |

**Audit log** : CHAQUE action admin → AdminAuditLog (qui, quoi, avant, apres, IP, heure)

---

## 9. ENDPOINTS API COMPLETS (~80 endpoints)

### User-facing (mobile)
```
Points:
  GET  /api/points/balance
  GET  /api/points/history
  GET  /api/points/summary

Shop:
  GET  /api/shop/rewards
  GET  /api/shop/rewards/{id}
  POST /api/shop/redeem
  GET  /api/shop/redemptions

Challenges:
  GET  /api/challenges/active
  GET  /api/challenges/{id}
  POST /api/challenges/{id}/join
  GET  /api/challenges/{id}/leaderboard
  GET  /api/challenges/{id}/my-score
  POST /api/challenges/{id}/photo-checkin

Streak:
  GET  /api/streak/current
  POST /api/streak/use-freeze

Badges:
  GET  /api/badges/my-badges
  GET  /api/badges/all
  PUT  /api/badges/{id}/display

Affiliation:
  GET  /api/affiliate/profile
  GET  /api/affiliate/referrals
  GET  /api/affiliate/earnings
  POST /api/affiliate/withdraw

Leaderboard:
  GET  /api/leaderboard/national
  GET  /api/leaderboard/hall-of-fame
  GET  /api/leaderboard/city/{city}
```

### Admin (~45 endpoints)
```
Dashboard:
  GET  /api/admin/dashboard/overview
  GET  /api/admin/dashboard/realtime (SignalR)

Users:
  GET  /api/admin/users
  GET  /api/admin/users/{id}
  PUT  /api/admin/users/{id}/plan
  PUT  /api/admin/users/{id}/points
  POST /api/admin/users/{id}/suspend
  POST /api/admin/users/{id}/notify
  POST /api/admin/users/{id}/reset-password
  POST /api/admin/users/{id}/refund

Challenges:
  GET/POST/PUT/DELETE /api/admin/challenges
  POST /api/admin/challenges/{id}/distribute-rewards
  PUT  /api/admin/challenges/{id}/participants/{userId}/disqualify
  GET  /api/admin/challenges/{id}/export

Config:
  GET/PUT /api/admin/config/points
  GET/PUT /api/admin/config/anticheat
  GET/PUT /api/admin/config/affiliate
  GET/PUT /api/admin/config/streak
  GET/PUT /api/admin/config/global
  GET/PUT /api/admin/config/feature-flags/{flag}

Shop:
  GET/POST/PUT/DELETE /api/admin/shop/rewards
  GET /api/admin/shop/redemptions
  PUT /api/admin/shop/redemptions/{id}/status

Badges:
  GET/POST/PUT /api/admin/badges
  POST /api/admin/badges/{id}/assign-manually

Notifications:
  GET/PUT /api/admin/notifications/templates
  POST /api/admin/notifications/send-manual

Affiliation:
  GET  /api/admin/affiliate/overview
  GET  /api/admin/affiliate/withdrawals
  PUT  /api/admin/affiliate/withdrawals/{id}/approve
  PUT  /api/admin/affiliate/withdrawals/{id}/reject

Finance:
  GET  /api/admin/finance/overview
  GET  /api/admin/finance/transactions
  GET  /api/admin/finance/api-costs

Monitoring:
  GET  /api/admin/monitoring/health
  GET  /api/admin/monitoring/logs
  GET  /api/admin/monitoring/api-stats
  GET  /api/admin/audit-log
```

---

## 10. CONTRAINTES TECHNIQUES

| Contrainte | Detail |
|------------|--------|
| Recalcul scores challenges | Cron Job 60 min |
| Cache classements | Redis sorted sets, TTL 5 min configurable |
| Transactions points | ACID obligatoire |
| Anti-triche | Background async |
| Commissions | decimal(18,2) |
| Donnees bancaires | AES-256 chiffre |
| Rate limit affiliation | 10 req/min |
| Config cache | Redis TTL 1h, invalidation on admin update |
| Dashboard admin | SignalR temps reel |
| Auth admin | JWT separe, session 2h |
| 2FA | Obligatoire SuperAdmin |
| Audit log | TOUTES actions admin sans exception |
| Exports CSV | Background job + email lien telechargement |
| Version min app | Force update configurable |
| Mode maintenance | Toggle + message + IP whitelist |

---

## 11. PHASES D'IMPLEMENTATION

### Phase 1 : Fondation Points + Streak + Config (3 semaines)
- Entites : PointTransaction, GamificationConfig, FeatureFlag, AppConfig
- Extensions User (points, streak, referral)
- Services : PointsService, GamificationConfigService, StreakService
- Integration SessionService → points
- Seed config valeurs par defaut
- Admin : page config gamification
- Mobile : widget points + streak sur Home

### Phase 2 : Challenges avances (2 semaines)
- Entites : ChallengeParticipation, ChallengeReward
- Extensions Challenge
- Service : ChallengeParticipationService
- Vrai leaderboard + progression
- Background job finalisation
- Admin : formulaire challenge avance
- Mobile : ecrans challenges

### Phase 3 : Boutique de points (2 semaines)
- Entites : ShopReward, RewardRedemption
- Service : ShopService
- Stock concurrence optimiste
- Workflow redemption
- Admin : CRUD recompenses + file redemptions
- Mobile : ecrans boutique

### Phase 4 : Badges / Achievements (1.5 semaines)
- Entites : Achievement, UserAchievement
- Service : AchievementService + moteur evaluation
- Integration dans chaque gain de points
- Seed achievements initiaux
- Admin : gestion badges
- Mobile : galerie achievements

### Phase 5 : Affiliation (2 semaines)
- Entites : AffiliationEvent, AffiliateProfile, WithdrawalRequest
- Service : AffiliationService + detection fraude
- Extension inscription (referralCode)
- Recompense differee
- Admin : dashboard affiliation + retraits
- Mobile : ecran parrainage + deep linking

### Phase 6 : Anti-triche complet (1 semaine)
- Config anti-triche en DB
- Detection automatique toutes les regles
- Admin : page flags + actions
- Clawback mechanism
- Nightly reconciliation job

### Phase 7 : Dashboard Admin complet (2.5 semaines)
- Sections A-K implementees
- AdminUser + roles + 2FA SuperAdmin
- AdminAuditLog toutes actions
- SignalR temps reel
- Exports CSV background
- Monitoring + alertes

### Phase 8 : Polish + Notifications + Tests (1.5 semaines)
- NotificationTemplate + envoi manuel/planifie
- Push notifications (achievement, streak, challenge, reward)
- Mode maintenance + feature flags
- Tests end-to-end
- Tests de charge
- Documentation API

**Total : ~16 semaines**

---

## 12. RISQUES ET MITIGATIONS

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Inflation points | Devalue recompenses | Config admin, commencer conservateur, monitoring |
| Fraude sessions fake | Points gonfles | Validation serveur, duree min, rate limits |
| Auto-parrainage | Points gratuits | Fingerprint + IP, recompenses differees, velocity |
| Race condition solde | Negatif/double-spend | Transaction serializable + FOR UPDATE + reconciliation |
| Perf leaderboard | Pages lentes | Index PostgreSQL Phase 1, Redis Phase 2 |
| Survente stock | Liability | Concurrence optimiste WHERE stock > 0 |
| Confusion streak timezone | Frustration | Grace period 36h, UI claire |
| Complexite admin | Bugs, lenteur | Roles separes, audit log, SignalR |
| Donnees bancaires | Securite | AES-256, acces FinanceManager uniquement |
| Exports gros volumes | Timeout HTTP | Background job + email lien |

---

## 13. FICHIERS CRITIQUES

**Backend** :
- `User.cs` → etendre avec 10+ nouveaux champs
- `SessionService.cs` → integrer gamification dans completion
- `BigBossDbContext.cs` → 14 nouveaux DbSets
- `ChallengeService.cs` → refonte complete avec participation

**Mobile** :
- `constants/api.ts` → ~35 nouveaux endpoints
- `index.tsx` (Home) → widgets points/streak/challenges
- 9 nouveaux ecrans

**Admin** :
- 11 nouvelles pages (sections A-K)
- Composants : DataTable, ConfigEditor, Chart, StatusBadge, AuditLog
////////////////////

#### SECTION B — Gestion des Utilisateurs

Liste complète avec filtres :
- Filtrer par : plan (Free/Premium/Elite), ville,
  date d'inscription, actif/inactif, signalé/normal
- Recherche par nom, email, téléphone, code parrainage

Pour chaque utilisateur, l'admin peut voir et modifier :
- Profil complet (nom, email, plan, date expiration abonnement)
- Historique des paiements
- Solde de points + historique transactions
- Streak actuel et historique
- Badges obtenus
- Challenges rejoints et scores
- Parrainages effectués et revenus d'affiliation
- Statut anti-triche (flaggé ou non, raison)
- Tous les logs d'activité (séances, repas, messages IA)
- Bouton : Suspendre le compte
- Bouton : Changer le plan manuellement
- Bouton : Ajouter/Retirer des points manuellement (avec motif obligatoire)
- Bouton : Réinitialiser le mot de passe
- Bouton : Envoyer une notification personnalisée
- Bouton : Rembourser un paiement

#### SECTION C — Gestion des Challenges

Liste de tous les challenges (passés, actifs, à venir)
avec pour chaque challenge :
- Nom, type, dates, métrique, statut
- Nombre de participants
- Graphe d'évolution du nombre de participants dans le temps
- Top 10 en temps réel avec scores
- Liste complète des participants avec scores et rangs
- Liste des participants flaggés par l'anti-triche
- Bouton : Modifier les détails du challenge
- Bouton : Arrêter le challenge prématurément
- Bouton : Disqualifier un participant (avec motif)
- Bouton : Distribuer les récompenses manuellement
- Bouton : Exporter CSV des participants et scores

Formulaire de création de challenge (tous les champs) :
- Titre FR / AR
- Description FR / AR
- Type : Monthly / Instant / CityVsCity / Annual
- Métrique : Volume / Sessions / Streak / Calories /
             Macros / PR_Count / Consistency
- Date début + Date fin
- Maximum participants (0 = illimité)
- Visible aux Free users : oui/non
- Plan minimum requis pour rejoindre
- Photo check-in obligatoire : oui/non
- Intervalle photo check-in (jours)
- Récompenses par rang :
  - Rang de → rang à
  - Type : Cash MAD / Mois Premium / Mois Elite /
            Produit / Coaching / Points
  - Valeur
  - Description
  - Points bonus supplémentaires
- Notification de lancement : oui/non

#### SECTION D — Configuration des Points et Récompenses

Tableau de tous les PointActionType avec :
- Points actuels attribués
- Champ modifiable pour changer la valeur
- Activer/désactiver l'action
- Limite journalière configurable
- Historique des modifications (qui a changé quoi et quand)

Tableau de toutes les récompenses échangeables :
- Nom, coût en points, stock, statut
- Bouton modifier chaque champ inline
- Bouton ajouter une nouvelle récompense
- Bouton activer/désactiver
- Graphe d'utilisation (combien de fois échangé)

#### SECTION E — Configuration Anti-Triche

Formulaire avec TOUS les paramètres de AntiCheatConfig :
- Chaque paramètre avec sa valeur actuelle, modifiable
- Description de l'impact de chaque paramètre
- Bouton sauvegarder avec confirmation
- Historique des modifications

Liste des utilisateurs flaggés :
- Filtre : flaggés aujourd'hui / cette semaine / en attente de revue
- Pour chaque flaggé : raison du flag, score de suspicion,
  détail des anomalies détectées, challenge concerné
- Boutons : Innocenter / Disqualifier / Bannir

#### SECTION F — Gestion de l'Affiliation

Configuration générale de l'affiliation :
- Formulaire AffiliateConfig complet avec tous les paramètres
- Bouton sauvegarder

Liste de tous les affiliés avec :
- Pseudo, niveau ambassadeur, parrainages actifs,
  gains totaux, gains en attente, disponible pour retrait
- Filtrer par niveau ambassadeur
- Trier par gains / parrainages / date

Demandes de retrait :
- Liste des demandes en attente
- Détail : utilisateur, montant, méthode, compte bancaire
- Boutons : Approuver / Rejeter (avec motif)
- Statut : En attente / Traitement / Complété / Rejeté
- Export CSV pour traitement bancaire groupé

Statistiques affiliation :
- Total des commissions payées ce mois
- Nombre de nouveaux inscrits via parrainage
- Taux de conversion des parrainés
- Top 10 des meilleurs parrains

#### SECTION G — Gestion des Notifications

Liste de tous les NotificationTemplate :
- Trigger, titre, corps du message, statut (actif/inactif)
- Bouton modifier chaque template
- Bouton tester (envoyer à l'admin uniquement)
- Historique des envois (combien envoyés, taux d'ouverture)

Envoi manuel de notification :
- Cible : tous les users / Premium uniquement / Elite /
          Free uniquement / par ville / par ID utilisateur
- Titre + Corps du message (FR et AR)
- Avec voix coach : oui/non
- Planifier : maintenant / date et heure précise
- Prévisualisation avant envoi
- Confirmation avec nombre de destinataires estimés

#### SECTION H — Gestion des Badges

Liste de tous les badges :
- Code, nom, catégorie, condition, statut
- Bouton modifier chaque badge
- Bouton activer/désactiver
- Statistiques : combien d'users ont ce badge

Créer un nouveau badge :
- Tous les champs de la table Badge
- Condition de déclenchement (TriggerType + TriggerValue)
- Option : attribuer rétroactivement aux users éligibles

Attribution manuelle de badge :
- Rechercher un user
- Sélectionner un badge
- Motif (ex: "Gagnant challenge spécial")

#### SECTION I — Revenus et Finances

Vue d'ensemble financière :
- MRR actuel et évolution (graphe 12 mois)
- Revenu par plan (Free ads / Premium / Elite / B2B)
- Revenu boutique et coaching
- Commissions d'affiliation payées
- Coûts API AI (Claude + ElevenLabs + GPT-4o)
- Marge brute estimée

Transactions :
- Liste de tous les paiements avec filtres
- Détail : user, montant, plan, date, méthode de paiement, statut
- Export CSV

Abonnements :
- Nouveaux abonnements par jour (graphe)
- Churn (annulations) par jour (graphe)
- Comparaison acquisition vs churn

#### SECTION J — Logs et Monitoring Technique

Logs en temps réel :
- Dernières 100 erreurs API avec stacktrace
- Logs des appels Claude API (coût, tokens, latence)
- Logs des appels YMove API
- Logs des appels ElevenLabs

Monitoring performances :
- Graphe de latence API (P50, P95, P99)
- Graphe de taux d'erreur
- Graphe de requêtes par minute
- Alertes configurables : envoyer un email si erreur > X%

Coûts API en temps réel :
- Coût Claude aujourd'hui / ce mois
- Tokens consommés Claude (Haiku vs Sonnet)
- Coût GPT-4o Vision
- Coût ElevenLabs (caractères générés)
- Projection coût fin de mois
- Alerte si coût dépasse un seuil configurable

#### SECTION K — Configuration Globale de l'App

Tous les paramètres globaux configurables sans code :

/////////////////////////////

### 9.3 Gestion des rôles Admin
```csharp
public class AdminUser
{
    public int Id { get; set; }
    public string Email { get; set; }
    public string PasswordHash { get; set; }
    public AdminRole Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime LastLoginAt { get; set; }
    public string LastLoginIp { get; set; }
}

public class AdminAuditLog
{
    public int Id { get; set; }
    public int AdminId { get; set; }
    public string Action { get; set; }       // Ex: "UPDATE_POINTS_CONFIG"
    public string EntityType { get; set; }   // Ex: "PointsConfig"
    public string EntityId { get; set; }
    public string OldValueJson { get; set; } // Valeur avant modification
    public string NewValueJson { get; set; } // Valeur après modification
    public string IpAddress { get; set; }
    public DateTime CreatedAt { get; set; }
}

public enum AdminRole
{
    SuperAdmin,      // Accès total à tout
    ContentManager,  // Challenges, badges, notifications, contenu
    SupportAgent,    // Utilisateurs, remboursements, logs
    FinanceManager,  // Revenus, affiliation, retraits
    ReadOnly         // Peut tout voir, ne peut rien modifier
}
```

Chaque action dans l'admin est loguée dans AdminAuditLog :
- Qui a fait quoi
- Quelle valeur avant
- Quelle valeur après
- Depuis quelle IP
- À quelle heure

---

## MODULE 10 — ENDPOINTS API REQUIS

------///////////////////

---

## CONTRAINTES TECHNIQUES

- Recalcul des scores challenges : Cron Job toutes les 60 minutes
- Cache Redis pour les classements (TTL configurable, défaut 5 min)
- Les transactions de points doivent être ACID
- Toutes les validations anti-triche en background asynchrone
- Les montants de commission en decimal(18,2)
- Données bancaires chiffrées AES-256
- Rate limit : max 10 req/min sur les endpoints affiliation
- Tous les paramètres de configuration chargés depuis la base
  de données et mis en cache Redis (TTL 1 heure)
- Un changement de config par l'admin invalide le cache Redis
  immédiatement (cache invalidation on update)
- Le dashboard admin utilise SignalR pour les données temps réel
  (métriques qui se mettent à jour sans refresh)
- Authentification admin : JWT séparé du JWT utilisateur
  avec durée de session plus courte (2h)
- Double authentification (2FA) obligatoire pour SuperAdmin
- Toutes les actions admin loguées dans AdminAuditLog sans exception
- Les exports CSV génèrent un fichier en background
  et envoient un email avec lien de téléchargement
  (ne pas bloquer la requête HTTP pour les gros exports)