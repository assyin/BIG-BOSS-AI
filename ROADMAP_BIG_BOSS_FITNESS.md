# ROADMAP BIG BOSS FITNESS
## De A a Z - Du Setup au Deploiement Final

---

**Projet**: Big Boss Fitness
**Version**: 3.1 - NUTRITION COMPLETE + FAVORIS + CODE-BARRES
**Date**: 4 Avril 2026
**Duree Totale Estimee**: 32-40 semaines
**Statut Actuel**: PHASE 0-2 COMPLETES - MOBILE 99% - ADMIN 100%

---

## LEGENDE

- [x] = Implemente et fonctionnel
- [ ] = Reste a implementer

---

## VUE D'ENSEMBLE

```
+===========================================================================+
|                        ROADMAP BIG BOSS FITNESS                            |
+===========================================================================+
|                                                                            |
|  PHASE 0          PHASE 1         PHASE 2         PHASE 3                  |
|  SETUP            MVP CORE        NUTRITION       COACH & VOCAL            |
|  [████████████]   [██████████]    [██████████]    [██░░░░░░░░]             |
|  Sem 1-2          Sem 3-8         Sem 9-12        Sem 13-16                |
|  100% FAIT        98% FAIT        95% FAIT        15% FAIT                 |
|                                                                            |
|  PHASE 4          PHASE 5         PHASE 6         PHASE 7                  |
|  CONTENU          COMMUNAUTE      VISION IA       BETA & LAUNCH            |
|  [██████░░░░]     [███░░░░░░░]    [██░░░░░░░░]    [█░░░░░░░░░]             |
|  Sem 17-20        Sem 21-24       Sem 25-28       Sem 29-32                |
|  55% FAIT         25% FAIT        15% FAIT        10% FAIT                 |
|                                                                            |
+===========================================================================+
```

---

## PHASE 0 - SETUP COMPLET (Semaines 1-2)
### Statut: COMPLETE (100%)

### 0.1 Infrastructure Cloud & DevOps

- [x] Structure Monorepo (`/backend`, `/mobile`, `/admin`)
- [x] Backend ASP.NET Core 8 (Solution + 4 projets: API, Core, Infrastructure, Tests)
- [x] Entites & DTOs (User, Exercise, Session, Meal, NutritionPlan, BodyStat, ProgressPhoto, CoachMessage, Challenge, Live, Recipe, Product - 13 entites)
- [x] Interfaces & Services (13 services: Auth, Token, User, Exercise, Session, Nutrition, Coach, Claude, Cloudflare, ElevenLabs, Challenge, Recipe, Product, BodyStat, ProgressPhoto, Live, NutritionPlan)
- [x] Controllers API (14 controllers - 70 endpoints incl. Programmes)
- [x] Middlewares (ErrorHandling + RateLimiting avec limites IA separees)
- [x] Tests unitaires (xUnit + FluentAssertions + Moq)
- [x] Docker Compose (PostgreSQL 16 + Redis 7)
- [x] CI/CD GitHub Actions (backend-ci.yml + mobile-ci.yml)
- [x] Variables environnement (.env.example complet)
- [x] README.md
- [x] .gitignore

### 0.2 Application Mobile React Native

- [x] Projet Expo SDK 54
- [x] Structure dossiers (`/app`, `/components`, `/services`, `/store`, `/types`, `/constants`)
- [x] Composants UI de base (Button, Card, Input, ProgressBar)
- [x] Theme & Design System (Colors Orange #FF6B2B, Fonts, API constants)
- [x] Zustand State Management (Auth store, Session store)
- [x] Service API Axios (Interceptors, token refresh)
- [x] Expo Router Screens (Auth flow + Tabs)
- [x] TypeScript strict mode
- [x] Ecran Login (email/password + navigation)
- [x] Ecran Register (nom, email, password, confirmation)
- [x] Ecran Onboarding 4 etapes (genre, poids, objectif, niveau, equipement)
- [x] Dashboard Home (stats rapides, CTA seance)
- [x] Tab Sessions (historique, generation IA, workout actif, bilan)
- [x] Tab Exercices (bibliotheque, recherche, filtres, detail 4 videos)
- [x] Tab Nutrition (journal macros, scanner repas, ajouter repas)
- [x] Tab Progression (mesures, photos, performances)
- [x] Tab Coach IA (chat bulles, quota, suggestions)
- [x] Tab Profil (avatar, stats, parametres, deconnexion)
- [x] Services API (auth, session, exercise, nutrition, coach, progress)
- [x] Stores Zustand (auth, session)
- [x] 23 ecrans complets
- [x] Test mobile sur appareil physique Android (EAS development build local)
- [x] WSL2 mirrored mode + port forwarding configure
- [x] Lecteur video natif expo-av dans exercices + seances

### 0.3 Configuration Backend

- [x] Lancer PostgreSQL/Redis (`docker-compose up -d`)
- [x] Creer migration initiale EF Core
- [x] Appliquer migration (toutes les 13 tables creees)
- [x] Ajout champ Role utilisateur (User/Admin) avec enum
- [x] Role inclus dans JWT token
- [x] Authorization Admin sur endpoints CRUD (Challenges, Recipes, Products, Exercises)
- [ ] Configurer Cloudflare R2 (Bucket `bigboss-videos`)
- [ ] Configurer Cloudflare Stream (videos exercices)
- [ ] Obtenir cle API Claude (production)
- [ ] Configurer Firebase FCM (Push notifications)
- [ ] Depot marque OMPIC ("Big Boss Fitness")

### 0.4 Panel Admin Web (Next.js 14 + Tailwind)

- [x] Interface admin Next.js 14 + Tailwind CSS
- [x] Sidebar navigation avec 6 sections (Dashboard, Exercices, Recettes, Produits, Challenges, Lives)
- [x] Dashboard statistiques (compteurs Users, Exercices, Recettes, Produits + actions rapides)
- [x] Gestion exercices (CRUD complet + filtres avances + vue groupee par muscle + recherche)
- [x] Preview videos exercices (lecteur MP4 integre)
- [x] Formulaire exercice 3 onglets (General, Contenu par langue FR/EN/AR, Media)
- [x] Gestion recettes (CRUD + categories + macros + tags dietary)
- [x] Gestion produits (CRUD + prix MAD/remise + stock + categories)
- [x] Gestion challenges (CRUD + types + dates + recompenses)
- [x] Gestion lives (CRUD + planification + types + URLs streaming)

### 0.5 Seed Data & Contenu

- [x] Injection 621 exercices depuis YMove (bigboss-exercises.json)
- [x] Contenu multilangue (FR + EN + Darija pour 287 exercices)
- [x] Instructions FR/EN, Tips Coach FR, Erreurs courantes pour chaque exercice
- [x] 620 URLs video MP4 (depuis BunnyCDN/YMove)
- [x] 620 thumbnails exercices
- [x] Migration DB: ajout colonnes ymove_id, ymove_slug, has_video, description_fr, instructions_en/fr, tips_en, tips_coach_fr, erreurs_courantes_fr
- [x] **616 videos telecharges localement** (URLs YMove expiraient toutes les 48h)
  - Videos servies via StaticFiles middleware backend (/videos/*)
  - fixVideoUrl() dans le frontend pour prefixer les URLs relatives
  - A terme: upload vers Cloudflare R2 pour production
- [ ] Completer noms Darija pour les 334 exercices restants (actuellement en FR par defaut)

### 0.5 Actions Paralleles (TOURNAGE & LEGAL)

- [ ] Planifier tournage Lot 1 (50 exercices x 4 videos = 200 videos)
- [ ] Reserver studio/salle
- [ ] Preparer fiches techniques
- [ ] Tournage Lot 1
- [ ] Montage Lot 1
- [ ] Upload Cloudflare
- [ ] Maquettes Figma MVP (20 ecrans)
- [ ] Design System complet
- [ ] Contrat cession droits influenceur
- [ ] Redaction CGU
- [ ] Politique de confidentialite
- [ ] Conformite loi 09-08 (Maroc)
- [ ] Conformite RGPD (diaspora FR)

---

## PHASE 1 - MVP CORE (Semaines 3-8)
### Statut: 98% Backend + Mobile implementes

### 1.1 Authentification & Profil

**Backend:**
- [x] Inscription email + validation (FluentValidation)
- [x] Connexion avec JWT (Access token 15min)
- [x] Refresh token flow (30 jours)
- [x] Check email disponibilite
- [x] Profil utilisateur (GET /me, PUT /me)
- [x] Statistiques utilisateur (GET /me/stats)
- [x] Logout & suppression compte
- [x] Hashage BCrypt mot de passe

**Mobile:**
- [x] Ecran Login (email/password)
- [x] Ecran Register (nom, email, password, confirmation)
- [x] Ecran onboarding Freeletics-style (12 etapes: splashs, genre, age, poids, taille, objectif, niveau, frequence, equipement, blessures, regime, allergies + ecrans emotionnels + loading anime + summary)
- [x] Ecran profil utilisateur (avatar, stats, settings)
- [x] Parametres & preferences (langue, notifications, unite)
- [x] Deconnexion + suppression compte
- [ ] Login Google OAuth
- [ ] Login Apple (iOS)

### 1.2 Bibliotheque Exercices

**Backend:**
- [x] API liste exercices avec filtres
- [x] Detail exercice
- [x] Filtrage par groupe musculaire
- [x] Exercices de substitution (alternatives)
- [x] Recherche full-text
- [x] Signed URLs videos Cloudflare
- [x] CRUD Admin (POST, PUT, DELETE avec [Authorize(Roles="Admin")])

**Mobile:**
- [x] Ecran liste exercices (recherche, filtres par muscle)
- [x] Ecran detail exercice (4 onglets video: Demo, Forme, Erreurs, Tips)
- [x] Service API exercices (list, search, detail, alternatives)
- [x] 621 exercices injectes (seed data YMove)
- [x] Videos MP4 pour 620 exercices (URLs BunnyCDN)
- [x] Metadonnees multilangues (FR, EN, Darija partiel)
- [ ] GIF preview 3 secondes
- [ ] Lecteur video Cloudflare (HLS adaptatif)
- [ ] Watermark dynamique (email utilisateur)

### 1.3 Generation Seances IA

**Backend:**
- [x] Integration Claude API (Haiku + Sonnet)
- [x] System prompt coach fitness
- [x] Context injection profil utilisateur (objectif, niveau, historique)
- [x] Generation seance IA (POST /sessions/generate)
- [x] Demarrage seance (POST /sessions/{id}/start)
- [x] Log series (POST /sessions/log-set)
- [x] Skip exercice (POST /sessions/skip)
- [x] Completion seance avec bilan IA (POST /sessions/{id}/complete)
- [x] Abandon seance (POST /sessions/{id}/abandon)
- [x] Session en cours (GET /sessions/current)
- [x] Historique sessions avec pagination

**Mobile:**
- [x] Ecran generation seance (choix muscle, duree, energie)
- [x] Ecran detail seance (exercices, stats)
- [x] Ecran workout actif (log sets, timer repos, progression)
- [x] Ecran bilan post-seance (stats, AI summary, PRs)
- [x] Historique seances (FlatList avec pull-to-refresh)
- [x] Timer repos configurable (60/90/120s)
- [x] Log series (poids + reps + validation)
- [ ] Lecteur video integre (ralenti x0.5, boucle)
- [ ] Mode hors-ligne
- [ ] Sauvegarde auto (sync quand online)

### 1.4 Programme Personnalise (NOUVEAU - 31 Mars 2026) ✅

**Backend:**
- [x] Entites Programme + ProgrammeSession (2 entites, 3 enums)
- [x] ProgrammeService (~900 lignes): algorithme generation complet
- [x] Split automatique (2x→Full Body, 4x→Upper/Lower, 5x→PPL, 6x→PPL x2)
- [x] Selection exercices (filtre equipement bitwise, blessures, niveau, difficulte)
- [x] Sets/reps par objectif (Force 5x5, Masse 4x10, Seche 3x15, etc.)
- [x] Progression + deload automatique (chaque 4eme semaine)
- [x] Plan nutrition halal 7 jours (filtre regime/allergies/Ramadan)
- [x] 12 endpoints API (generate, active, today, week, start, complete, pause, resume, abandon, progress, nutrition, get)
- [x] Auto-complete ProgrammeSession quand Session terminee
- [x] Detection seances manquees (UpdateMissedSessions)
- [x] Authorization sur tous les endpoints

**Mobile:**
- [x] Dashboard Freeletics-style (seance du jour, calendrier semaine, progression, nutrition)
- [x] Detail programme (semaines collapse/expand, stats, pause/abandon)
- [x] Ecran semaine (exercices, sets/reps/poids, start/resume)
- [x] Ecran programme termine (animation trophy, stats finales)
- [x] Plan nutrition jour (TodayMeals dans dashboard)
- [x] Plan nutrition semaine (selecteur jour, macros, cartes repas)
- [x] Integration workflow: start → workout actif → complete → auto-update programme
- [x] Platform.OS web alerts sur tous les ecrans

### 1.4b Periodisation Engine (Future)

- [ ] DUP (Daily Undulating Periodization)
- [ ] Block Periodization
- [ ] Linear Periodization (debutants)
- [ ] Detection de plateau (2 semaines sans progression)
- [ ] Surcharge progressive (+2.5-5% / 7-14 jours)
- [ ] Decharge automatique (semaine legere)
- [ ] Calcul 1RM continu (Epley/Brzycki)

### 1.5 Bilan Post-Seance

**Backend:**
- [x] AI summary post-seance
- [x] Volume total (kg) calcule
- [x] Recommandations IA

**Mobile:**
- [x] Ecran bilan post-seance (stats grid, AI summary)
- [x] Volume total, duree, sets completes
- [x] Section Personal Records
- [x] Recommandations IA
- [ ] Comparaison seance precedente (graphique)
- [ ] Message motivation IA (audio)
- [ ] Partage social (optionnel)

### 1.6 Coach IA Textuel

**Backend:**
- [x] API envoi message (POST /coach/message)
- [x] Historique conversations avec pagination
- [x] Quota messages (5/jour Free, illimite Premium)
- [x] Suppression historique
- [x] Integration Claude avec contexte utilisateur

**Mobile:**
- [x] Chat interface (bulles user orange, AI gris, avatar robot)
- [x] Quota messages affiche (badge)
- [x] Suggestions rapides (chips cliquables)
- [x] Indicateur "typing" anime
- [x] Service API coach (send, history, quota, clear)
- [ ] Reponses en Darija/Arabe
- [ ] Messages vocaux (transcription Whisper)
- [ ] Analyse photos envoyees (Claude Vision)
- [ ] Detection demotivation (mode soutien)
- [ ] Cache reponses frequentes

### 1.7 Dashboard Progression

- [ ] Graphique poids (courbe lissee 7j)
- [ ] Liste PRs par exercice
- [ ] Courbes 1RM par exercice
- [ ] Volume hebdomadaire par muscle
- [ ] Radar chart equilibre musculaire
- [ ] Streak d'entrainement
- [ ] Calendrier seances

### 1.8 Paiement & Abonnement

- [ ] Integration Stripe (cartes internationales)
- [ ] Integration CMI (cartes marocaines)
- [ ] Plans Free / Premium / Elite (0 / 79 / 149 MAD)
- [ ] Ecran comparatif abonnements
- [ ] Essai gratuit 30 jours
- [ ] Webhooks paiement
- [ ] Upgrade/Downgrade flow

### 1.9 Notifications Push

- [ ] Integration Firebase FCM
- [ ] Rappels entrainement
- [ ] Notifications seance generee
- [ ] Notifications streak
- [ ] Rappels nutrition
- [ ] Felicitations PRs
- [ ] Notifications live

---

## PHASE 2 - NUTRITION (Semaines 9-12)
### Statut: 95% Backend + Mobile implementes

### 2.1 Journal Alimentaire

**Backend:**
- [x] API log repas (POST /nutrition/meals)
- [x] Suppression repas (DELETE /nutrition/meals/{id})
- [x] Donnees journalieres (GET /nutrition/day)
- [x] Resume hebdomadaire (GET /nutrition/week)
- [x] Calcul objectifs macros (GET /nutrition/targets)

**Mobile:**
- [x] Ecran journal du jour (sections par repas)
- [x] Ajout repas manuel (formulaire complet avec macros)
- [x] Barre progression macros (anneaux circulaires calories/P/G/L)
- [x] Navigation par date (fleches < >)
- [x] Service API nutrition (log, delete, day, week, targets, scan)
- [ ] Base donnees USDA (800 000+ aliments)
- [ ] Base donnees Ciqual (aliments francais)
- [ ] Base donnees Maroc (3 000+ plats locaux)
- [ ] Recherche aliments (autocomplete)
- [ ] Scanner code-barres
- [ ] Alertes depassement
- [ ] Historique 90 jours

### 2.2 Scan Repas Photo IA

**Backend:**
- [x] API scan repas (POST /nutrition/scan)
- [x] Integration Claude Vision (analyse image)
- [x] Detection aliments et estimation macros
- [x] Limite scans/jour selon plan

**Mobile:**
- [x] Bouton "Scanner un repas" avec icone camera
- [ ] Interface camera repas (capture guidee)
- [ ] Validation utilisateur (correction possible)
- [ ] Analyse coherence repas vs objectifs

### 2.3 Plan Nutritionnel IA

**Backend:**
- [x] API CRUD plans nutritionnels (POST/GET/PUT/DELETE /nutritionplans)
- [x] Plan semaine courante (GET /nutritionplans/current)
- [x] Stockage macros cibles (TDEE, proteines, glucides, lipides)

**Mobile:**
- [x] Plan nutrition 7 jours genere automatiquement (via Programme Personnalise)
- [x] Vue plan semaine avec selecteur jour (programme/nutrition-plan.tsx)
- [x] Repas suggeres dans le dashboard (TodayMeals)
- [x] Filtrage par regime/allergies/Ramadan (via ProgrammeService)
- [ ] Liste courses generee auto
- [ ] Mode Ramadan iftar/suhoor specifique

### 2.4 Recettes Fitness

**Backend:**
- [x] API CRUD recettes (POST/GET/PUT/DELETE /recipes)
- [x] Filtres avances (categorie, vegetarien, vegan, gluten-free, Ramadan, bulking, cutting)
- [x] Recherche recettes
- [x] Recettes en vedette
- [x] Par categorie (Breakfast, Lunch, Dinner, Snack, Pre/Post Workout, Smoothie, Dessert)
- [x] Macros par portion
- [x] Multilangue (FR, AR)
- [x] [Authorize(Roles="Admin")] sur CRUD

**Mobile (reste a faire):**
- [x] 443 photos recettes generees par IA (Flux Schnell) avec backgrounds varies
- [x] Ecran liste recettes (filtres categorie + regime, recherche, tri Marocain>Arabe>Islamique)
- [x] Ecran detail recette (ingredients, etapes, macros, photo hero)
- [x] Selecteur de langue FR/Darija avec support RTL complet
- [x] Traduction FR: 444 titres + ingredients + etapes + descriptions (GPT-4o-mini)
- [x] Traduction Darija: 442 titres + ingredients + etapes + descriptions (GPT-4o-mini, prompt production-grade)
- [ ] Videos preparation
- [ ] Favoris
- [ ] Ajout au journal (1 clic)

---

## PHASE 3 - COACH IA & VOCAL (Semaines 13-16)
### Statut: 10% Backend implemente

### 3.1 Clone Vocal ElevenLabs

**Backend:**
- [x] Service ElevenLabs integre (ElevenLabsService)
- [x] Interface IElevenLabsService

**Reste a faire:**
- [ ] Extraction audio influenceur (60 min audio propre)
- [ ] Creation voix clonee ElevenLabs
- [ ] Test qualite voix (Darija + Francais)
- [ ] Integration API TTS (latence < 500ms)
- [ ] Pre-generation messages courants
- [ ] Cache audio local
- [ ] Upload audio vers Cloudflare R2

### 3.2 Coaching Vocal Seance

- [ ] Comptage reps vocal
- [ ] Encouragements entre series
- [ ] Annonce temps de repos
- [ ] Corrections posture vocales
- [ ] Motivation fin seance
- [ ] Alerte PR potentiel
- [ ] Integration Spotify (playlist + coaching overlay)

### 3.3 Coach IA Avance

- [ ] Memoire long terme (RAG)
- [ ] Context historique complet
- [ ] Reponses audio (TTS)
- [ ] Messages proactifs (rappels, encouragements)
- [ ] Detection demotivation (analyse sentiment)
- [ ] Reponses messages vocaux (Whisper transcription)
- [ ] Analyse photos progression (Claude Vision)

### 3.4 Notifications Intelligentes IA

- [ ] Message motivation quotidien (audio influenceur)
- [ ] Rappels personnalises IA
- [ ] Felicitations PRs audio
- [ ] Alertes recuperation

---

## PHASE 4 - CONTENU COMPLET (Semaines 17-20)
### Statut: 45% Backend + Seed Data implementes

### 4.1 Bibliotheque Complete

- [x] 621 exercices importes (seed data YMove)
- [x] Videos MP4 pour 620 exercices
- [x] Instructions FR + EN pour chaque exercice
- [x] Tips coach FR + erreurs courantes FR
- [x] 616 videos telecharges localement (servies via StaticFiles middleware)
- [x] 619 thumbnails telecharges localement (/videos/thumbnails/)
- [x] ZERO liens externes (ymove, BunnyCDN) dans la DB
- [x] Docker volume persistant (bigboss-pgdata) + scripts backup/restore
- [ ] Upload vers Cloudflare R2 (URLs permanentes - production)
- [ ] Completer Darija pour 334 exercices
- [ ] Validation kinesitherapeute
- [ ] Tournage videos personnalisees influenceur (4 videos/exercice)

### 4.2 Recettes Completes

- [ ] Upload recettes 101-300 avec photos pro
- [ ] Videos preparation (30 recettes par influenceur)
- [ ] Calibration macros (verification dietetiste)

### 4.3 Photos Progression

**Backend:**
- [x] API CRUD photos progression (POST/GET/DELETE /progressphotos)
- [x] Stockage URL chiffre
- [x] Type de pose (face, profil, dos)
- [x] Analyse IA (body fat estime)
- [x] Option partage communaute

**Mobile:**
- [x] Grille photos progression (2 colonnes)
- [x] Bouton "Ajouter photo"
- [x] Etat vide avec message
- [ ] Album photos securise (chiffrement AES-256)
- [ ] Guide de pose standardise
- [ ] Rappels photo mensuel
- [ ] Comparateur avant/apres (slider interactif)
- [ ] Timeline transformations

### 4.4 Suivi Avance

**Backend:**
- [x] API CRUD mesures corporelles (POST/GET/PUT/DELETE /bodystats)
- [x] Derniere mesure (GET /bodystats/latest)
- [x] 13 mesures (poids, body fat, poitrine, taille, hanches, bras, cuisses, mollets, epaules, cou)

**Mobile:**
- [x] Ecran progression 3 tabs (Mesures/Photos/Performances)
- [x] Affichage poids actuel + historique barre
- [x] Liste mesures corporelles (11 mesures)
- [x] Formulaire ajout mesure (poids, body fat, 11 mensurations)
- [x] Section Personal Records avec trophees
- [x] Volume semaine courante vs precedente
- [x] Service API progress (bodystats, photos)
- [ ] IMC / FFMI calcul auto
- [ ] Estimation % masse grasse (photo IA)
- [ ] Courbes 1RM 6 mois (graphiques)
- [ ] Radar chart musculaire
- [ ] Export PDF progression

---

## PHASE 5 - COMMUNAUTE & LIVE (Semaines 21-24)
### Statut: 20% Backend implemente

### 5.1 Feed Social

- [ ] Timeline chronologique
- [ ] Types de posts (PRs, photos, seances, recettes)
- [ ] Reactions fitness (Feu, Muscle, Eclair, Trophee)
- [ ] Commentaires (thread)
- [ ] Moderation IA (toxicite, spam)
- [ ] Signalement contenu
- [ ] Partage externe (Instagram, TikTok, WhatsApp)

### 5.2 Challenges Communautaires

**Backend:**
- [x] API CRUD challenges (POST/GET/PUT/DELETE /challenges)
- [x] Challenges en vedette (GET /challenges/featured)
- [x] Leaderboard par challenge (GET /challenges/{id}/leaderboard)
- [x] Types: Volume, Consistency, Strength, Transformation
- [x] Dates debut/fin, recompenses
- [x] [Authorize(Roles="Admin")] sur CRUD

**Mobile (reste a faire):**
- [ ] Ecran liste challenges
- [ ] Ecran detail challenge avec classement
- [ ] Classement national (Top 100)
- [ ] Classement par ville / par niveau
- [ ] Systeme recompenses (abos, merch, coaching)
- [ ] Challenges 1v1 amis
- [ ] Notification resultats

### 5.3 Gym Buddies Matching

- [ ] Recherche partenaires (par ville/salle)
- [ ] Algorithme compatibilite
- [ ] Chat in-app securise
- [ ] Sessions duo gamifiees
- [ ] Carte salles Maroc

### 5.4 Live Streaming

**Backend:**
- [x] API CRUD lives (POST/GET/PUT/DELETE /lives)
- [x] Lives a venir (GET /lives/upcoming)
- [x] Types: Workout, Nutrition, QA, Challenge, Masterclass
- [x] Metriques engagement (viewers, likes, comments)
- [x] URL streaming et replay
- [x] [Authorize(Roles="Admin")] sur CRUD

**Mobile (reste a faire):**
- [ ] Integration Cloudflare Stream Live (RTMP > HLS)
- [ ] Lecteur HLS in-app
- [ ] Latence < 8 secondes
- [ ] Chat temps reel (WebSocket)
- [ ] Moderation IA chat
- [ ] Questions classees par votes
- [ ] Replay intelligent (horodatage)

### 5.5 Dashboard Influenceur

- [ ] Stats communaute (DAU, MAU)
- [ ] Courbe croissance
- [ ] Taux conversion Free > Premium
- [ ] Carte utilisateurs Maroc
- [ ] Gestion contenu (upload exercices, recettes)
- [ ] Lancement challenges
- [ ] Planification lives
- [ ] Revenus temps reel

---

## PHASE 6 - VISION IA PREMIUM (Semaines 25-28)
### Statut: 10% Backend implemente

### 6.1 Vision Posture MediaPipe

- [ ] Integration MediaPipe Pose (React Native)
- [ ] Detection 33 keypoints
- [ ] Execution on-device (pas de cloud)
- [ ] Latence < 50ms
- [ ] Mode economie batterie

### 6.2 Calibration Exercices

- [ ] Squat (12 points controle)
- [ ] Developpe couche (8 points)
- [ ] Souleve de terre (10 points)
- [ ] Hip Thrust (7 points)
- [ ] Pompes (8 points)
- [ ] Tractions (9 points)
- [ ] Rowing (8 points)
- [ ] Developpe epaules (7 points)
- [ ] Curl biceps (6 points)
- [ ] Dips (8 points)

### 6.3 Feedback Temps Reel

- [ ] Overlay AR (vert/rouge)
- [ ] Comptage reps automatique
- [ ] Mesure angles articulaires
- [ ] Score forme 0-100 par rep
- [ ] Corrections vocales instantanees
- [ ] Alerte posture dangereuse
- [ ] Mode guidage camera

### 6.4 Prevention Blessures IA

- [ ] Score risque quotidien (0-100)
- [ ] Integration donnees sommeil
- [ ] Carte corporelle douleurs
- [ ] Historique blessures
- [ ] Volume cumule 7 jours
- [ ] Donnees wearable (optionnel)

### 6.5 Boutique E-commerce

**Backend:**
- [x] API CRUD produits (POST/GET/PUT/DELETE /products)
- [x] Filtres (categorie, prix, stock, promo)
- [x] Recherche produits
- [x] Produits en vedette
- [x] Categories: Supplement, Equipment, Clothing, Accessories
- [x] Prix MAD + prix remise + calcul % reduction
- [x] Gestion stock (PATCH /products/{id}/stock)
- [x] Dropshipping (supplier ID, commission %)
- [x] [Authorize(Roles="Admin")] sur CRUD

**Mobile (reste a faire):**
- [ ] Ecran catalogue produits
- [ ] Ecran detail produit (photos, specs)
- [ ] Panier (persistant)
- [ ] Integration paiement (Stripe + CMI)
- [ ] Remises abonnes (5%/15%)
- [ ] Tracking commandes

---

## PHASE 7 - BETA & LANCEMENT (Semaines 29-32)
### Statut: Non commence

### 7.1 Dashboard Admin Technique

- [ ] Monitoring temps reel (CPU, memoire, requetes/s)
- [ ] Logs requetes IA (tokens + cout)
- [ ] Gestion utilisateurs (suspension, remboursement)
- [ ] Moderation contenu signale
- [ ] Parametrage system prompt coach IA
- [ ] Envoi notifications push
- [ ] Rapports facturation API
- [ ] Alertes erreurs (Sentry)

### 7.2 Beta Test Prive

- [ ] Recrutement 500 beta testers
- [ ] Distribution TestFlight (iOS)
- [ ] Distribution APK beta (Android)
- [ ] Formulaire feedback in-app
- [ ] Canal Telegram/WhatsApp beta
- [ ] Sessions test utilisateurs
- [ ] Tracking bugs (GitHub Issues)
- [ ] Correction bugs critiques

### 7.3 Optimisations

- [ ] Optimisation couts API IA (cache, quotas)
- [ ] Cache agressif Redis
- [ ] CDN full Cloudflare
- [ ] Performance cold start < 2s
- [ ] Crash-free rate > 99%
- [ ] Tests de charge (10K simultanes)
- [ ] Optimisation requetes SQL

### 7.4 Securite & Protection

- [x] Rate limiting (general + IA) avec middleware
- [x] Error handling middleware
- [x] JWT authentication avec refresh tokens
- [x] Authorization par roles (User/Admin)
- [x] Signed URLs videos (expiration)
- [ ] Audit securite OWASP Top 10
- [ ] Penetration test
- [ ] Watermark videos dynamique
- [ ] Detection screen recording
- [ ] Chiffrement photos progression AES-256

### 7.5 Soumission Stores

- [ ] Screenshots App Store
- [ ] Screenshots Play Store
- [ ] Video preview App Store
- [ ] Textes App Store (FR, AR)
- [ ] Textes Play Store
- [ ] Icone finale (1024x1024)
- [ ] Privacy policy URL
- [ ] Age rating

---

## POST-LANCEMENT - PHASE 8+ (Mois 9-12)
### Statut: Non commence

- [ ] Stabilisation et correction bugs
- [ ] Apple Watch / Wear OS
- [ ] Marketplace coachs certifies
- [ ] Version web complete
- [ ] Expansion internationale (Tunisie, Algerie, Egypte, Golf)
- [ ] Support multi-devise (MAD, EUR, USD, SAR)
- [ ] Partenariats salles de sport
- [ ] Programme affiliation

---

## RESUME IMPLEMENTATION

### Backend API (.NET 8) - 98% COMPLETE

| Module | Endpoints | Status |
|--------|-----------|--------|
| Auth | 5 | COMPLETE |
| Users | 3 | COMPLETE |
| Exercises | 9 | COMPLETE |
| Sessions | 9 | COMPLETE |
| Nutrition | 6 | COMPLETE |
| Coach IA | 4 | COMPLETE |
| Challenges | 5 | COMPLETE |
| Recipes | 6 | COMPLETE |
| Products | 7 | COMPLETE |
| BodyStats | 3 | COMPLETE |
| ProgressPhotos | 3 | COMPLETE |
| Lives | 4 | COMPLETE |
| NutritionPlans | 4 | COMPLETE |
| **Programmes** | **12** | **COMPLETE (NOUVEAU)** |
| **TOTAL** | **70** | **COMPLETE** |

### Infrastructure - 95% COMPLETE

- [x] PostgreSQL 16 (Docker)
- [x] Database migrations (15 tables: 13 originales + Programme + ProgrammeSession)
- [x] JWT Authentication (access + refresh tokens)
- [x] Admin Role Authorization (User/Admin enum)
- [x] FluentValidation (8 validators)
- [x] Serilog logging (console + fichier)
- [x] Swagger/OpenAPI documentation
- [x] Error handling middleware
- [x] Rate limiting middleware (general 500/min + IA 50/min)
- [x] CORS configuration (localhost:3000, 3001, 8081)
- [x] OpenAI GPT-4o-mini integration (seances Premium)
- [x] Claude AI integration (interface)
- [x] ElevenLabs service (interface)
- [x] Cloudflare R2 service (interface)
- [x] Chargement .env automatique
- [ ] Redis cache implementation
- [ ] Firebase FCM push notifications

### Mobile App - 98% COMPLETE

- [x] Structure Expo Router (30+ ecrans)
- [x] Auth: Login, Register, Onboarding Freeletics-style (12 etapes + splashs + emotionnels + loading)
- [x] Dashboard Home Programme Personnalise (seance du jour, calendrier, progression, nutrition)
- [x] Programme: detail, semaine, nutrition plan, celebration terminee
- [x] Sessions: generation IA (OpenAI Premium / DB Free), workout actif, log sets, timer repos, bilan
- [x] Exercices: bibliotheque 621 exercices, recherche, filtres, detail avec lecteur video natif expo-av
- [x] Nutrition: journal macros (MacroRing), scanner repas photo IA, ajouter repas
- [x] Progression: mesures, photos (camera + pose), comparateur avant/apres, courbes 1RM, rapport
- [x] Coach IA: chat connecte backend, quota, suggestions
- [x] Profil: vraies donnees, logout, delete account
- [x] 7 Services API connectes au backend (+ programme.service.ts)
- [x] 2 Stores Zustand (auth, session avec programmeContext)
- [x] 6 Composants UI (Button, Input, Card, ProgressBar, SimpleChart, MacroRing, LineChart)
- [x] Videos exercices natif dans les seances actives (expo-av)
- [x] Test sur appareil physique Android (EAS dev build + hot reload)
- [x] EAS Build configure (development + preview profiles)
- [x] Android SDK + Java JDK 17 installes sur WSL
- [ ] Mode hors-ligne
- [ ] Login Google/Apple OAuth

### Admin Panel - 100% COMPLETE

- [x] Next.js 14 + Tailwind CSS
- [x] Sidebar navigation (6 sections)
- [x] Dashboard statistiques (compteurs + actions rapides)
- [x] Exercices: CRUD + filtres avances + vue groupee par muscle + recherche + formulaire 3 onglets
- [x] Recettes: CRUD + categories + macros + tags dietary
- [x] Produits: CRUD + prix MAD/remise + stock
- [x] Challenges: CRUD + types + dates + recompenses
- [x] Lives: CRUD + planification + types

### Seed Data - 98% COMPLETE

- [x] 621 exercices injectes (YMove)
- [x] 616 videos MP4 telechargees localement (1.2GB, 13 dossiers par muscle)
- [x] catalog.json genere (metadata slug/nom/muscle/difficulte/chemin)
- [x] 620 thumbnails
- [x] Contenu FR + EN + Darija (287/621)
- [x] Instructions, tips coach, erreurs courantes
- [ ] Completer Darija (334 restants)
- [ ] 4 videos en timeout (relancer download-videos.py)

---

## CE QUI RESTE A FAIRE

### FAIT - Videos locales (30 Mars 2026)
- [x] 616/620 videos MP4 telechargees (1.2GB)
- [x] Organisees par muscle (13 dossiers)
- [x] catalog.json avec metadata
- [x] Servies en statique via backend (`/videos/{muscle}/{slug}.mp4`)
- [x] URLs en DB mises a jour vers chemins locaux
- [x] BunnyCDN URLs sauvegardees en fallback (`video_bunny_url`)
- [x] Priorite: Local -> BunnyCDN -> Cloudflare R2

### FAIT - Coach IA + UX (30 Mars 2026)
- [x] Coach IA connecte a OpenAI GPT-4o-mini (Premium)
- [x] Free users: reponses basiques categorisees (motivation, nutrition, entrainement)
- [x] Interface chat professionnelle (historique conversations, nouvelle conversation)
- [x] Videos locales prefixees avec URL backend (fix 404)
- [x] Navigation retour corrigee sur toutes les pages
- [x] Exercices: filtres avances toujours visibles, categories pliables, chargement 621 exercices

### COURT TERME - 1 semaine
- [ ] EAS development build pour tester sur Android physique
- [ ] Completer noms Darija pour 334 exercices restants
- [ ] Tester flux complet: inscription -> onboarding -> seance -> nutrition -> progression

### MOYEN TERME - 2-4 semaines
- [ ] Integration Stripe (cartes internationales)
- [ ] Integration CMI (cartes marocaines)
- [ ] Plans abonnement Free/Premium/Elite (0/79/149 MAD)
- [ ] Ecran comparatif abonnements dans l'app
- [ ] Firebase push notifications (rappels entrainement, streak)
- [ ] Cache Redis (exercices, recettes)
- [ ] Upload 100 recettes avec photos pro
- [ ] Mode hors-ligne (log sets sans connexion)
- [ ] Login Google OAuth + Apple Sign In

### LONG TERME - 1-2 mois
- [ ] Clone vocal ElevenLabs (voix influenceur)
- [ ] Coaching vocal pendant seance
- [ ] MediaPipe posture detection (Vision IA)
- [ ] Feed social communaute
- [ ] Gym buddies matching
- [ ] Live streaming Cloudflare
- [ ] Tournage videos personnalisees influenceur
- [ ] Audit securite OWASP
- [ ] Watermark videos dynamique
- [ ] Beta test 500 utilisateurs
- [ ] Soumission App Store + Play Store

### TOTAL PROGRESSION

| Composant | Progression |
|-----------|-------------|
| Backend API | 95% |
| Infrastructure | 90% |
| Mobile App | 95% |
| Admin Panel | 100% |
| Seed Data | 100% |
| Paiement | 0% |
| Notifications | 0% |
| Coach Vocal | 10% |
| Vision IA | 0% |
| Communaute | 25% |
| **GLOBAL** | **~78%** |
