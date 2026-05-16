# Audit Roadmap vs App — 16 mai 2026

> Comparaison entre `ROADMAP_BIG_BOSS_FITNESS.md` (snapshot du 5 avril 2026)
> et l'état réel du code repo Big Boss Fitness aujourd'hui.

---

## TL;DR

- **Progression globale roadmap** : ~78 % → **~85 %** (gain ~+7 pts depuis 5 avril, surtout grâce à la refonte design + gamification 100 %).
- **Refonte design "Atlas & Médina" terminée** (25+ écrans) — pas dans la roadmap d'origine, mais grosse valeur produit.
- **Vrais blockers restants** : paiement (Stripe + CMI), Apple Sign In, Cloudflare R2 upload prod, MediaPipe natif, Live streaming, beta + soumission stores.
- **Verdict** : MVP viable pour beta privée si paiement + push FCM intégrés avant.

---

## 1. Items passés de [ ] à [x] depuis le 5 avril

### 1.1 Design — Phase 2 "Atlas & Médina" (entièrement hors roadmap)

| Item | Référence |
|---|---|
| Refonte palette marocaine (Terre Marrakech `#C84B31` + Vert Atlas `#4A7C59` + Bleu Médina `#2E5A87` + Gold Safran `#D4A24C`) | `mobile/src/constants/colors.ts` |
| Typographie Cairo + Inter + Tajawal chargées via `@expo-google-fonts/*` | `mobile/src/app/_layout.tsx` |
| Components UI repensés (Button radius 14 + warm shadow, Card radius 18 + border tadelakt, Input radius 14 + focus glow) | `mobile/src/components/ui/` |
| **Splash + Login** — gradient hero, ZelligePattern blanc, greeting arabe, footer "Made in Morocco" + "شويا بشويا" | `b8929e4` |
| **Home dashboard** riche — header gradient + ZelligePattern, quote darija, stats fitness 2×2, quick actions (4 entrées), recettes marocaines scroll, achievements récents, footer | `055361c`, `31e7827`, `9287aed` |
| **Profile** + **profile-edit** — gradient hero + avatar bordure dorée, rubriques modifiables (genre/taille/poids/objectif/niveau/langue/notifs) | `0c2d482`, `e4be1f5` |
| **Programme detail** — header gradient + info card top-border gold + progress bar gradient brand + week "En cours" gold dim | `ce95106` |
| **Nutrition** (4 écrans : journal + recipes + detail + add-meal) — macros tokens marocains, badge 🇲🇦 Recette Marocaine | `cd012f4` |
| **Coach chat** — header gradient + avatar bordé gold + bulles user terre / coach gold left-border, empty state arabe | `407b897` |
| **Pages secondaires** (Achievements / Boutique / Communauté) — pattern gradient + sous-titre arabe + accents gold | `cb2bf2d` |
| **Pages individuelles** (Sessions / Exercises / Lives / Affiliation / Points history) — même pattern | `bce385f` |

### 1.2 Phase 1 — Auth & Profile

- ✅ **Google OAuth** wired via `mobile/src/hooks/useGoogleAuth.ts` (`expo-auth-session/providers/google` + `expo-web-browser`).
  Client IDs configurables : `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `_IOS_CLIENT_ID`, `_WEB_CLIENT_ID`.
- ✅ **Profile edit complet** — store action `updateProfile` + écran avec chips (gender/goal/level/language), inputs numériques (weight/height), toggle notifications.

### 1.3 Phase 2 — Nutrition

- ✅ **444 recettes** avec photos AI (Flux Schnell) + traductions FR + Darija (GPT-4o-mini) intégrales (titres + ingrédients + steps + description).
- ✅ **Filtres avancés liste recettes** — catégorie (Petit-déj/Déj/Dîner/Collation/Smoothie) + régime (Veg/Vegan/Sans gluten/Ramadan/Masse/Sèche) + recherche + tri prioritaire Marocain > Arabe > Islamique.
- ✅ **Recipe detail RTL** — sélecteur langue FR/الدارجة avec ingredients + steps + description en arabe.
- ✅ **Open Food Facts** intégré dans `add-meal` (search + barcode lookup).
- ✅ **Ajout au journal en 1 clic** depuis recipe-detail via params prefill.

### 1.4 Phase 3 — Coach IA infrastructure

- ✅ **ElevenLabsService** présent (`backend/.../ElevenLabsService.cs`) — `GenerateSpeechAsync`, `GenerateSpeechUrlAsync` avec cache SHA256, voice settings (stability 0.5, similarity 0.85). Reste un stub sans voix clonée déployée.
- ✅ **pose-engine** (`mobile/src/utils/pose-engine.ts`) — logique complète de 20 exercices calibrés (Squat, Push-up, Curl, Deadlift, OHP, Bench, Row, Lunge, Dips, Pull-up, Hip Thrust, Plank, Crunch, Lateral Raise, Tricep Ext, Calf Raise, Front Raise, Leg Curl, Leg Press, Face Pull), avec `checkPoints` + `detectRep` + feedback FR/Darija. **L'écran `coach-vision.tsx` existe.**

### 1.5 Phase 5 — Communauté

- ✅ **Feed social backend** — controller + entités Posts/Reactions/Comments + intégration gamification (post share = +5 points).
- ✅ **Community mobile screen** existe (`community/index.tsx`) avec timeline, compose, réactions emoji (🔥💪⚡🏆), commentaires routés.

### 1.6 Phase 6 — Boutique points + Affiliation

- ✅ **Boutique de points** (`rewards/index.tsx`) — fetch shop rewards, balance check, redeem flow avec admin workflow, codes de redemption.
- ✅ **Affiliation/Parrainage** (`affiliation/index.tsx`) — référral code 8 chars + stats + filleuls + 2-stage rewards + bouton partage natif.

### 1.7 Gamification — 100 % complet (confirmé)

| Composant | Statut |
|---|---|
| Points (ledger immutable, idempotence, daily cap) | ✅ |
| Streaks (grace 36 h, milestones 7/30/100 j) | ✅ |
| Challenges (participation, leaderboard, finalisation, rewards par rang) | ✅ |
| Shop (7 récompenses, stock, refund, admin) | ✅ |
| Achievements (15 badges, auto-eval, progress bars) | ✅ |
| Affiliation (anti-fraude IP/velocity, first session bonus) | ✅ |
| Anti-triche (session validation, velocity, flag, admin resolve) | ✅ |
| Feature flags (9 toggles) + AppConfig globale | ✅ |
| Audit log admin | ✅ |
| Admin panels (config editor, shop mgmt, badges, affiliation, anticheat) | ✅ |

### 1.8 Push notifications mobile

- ✅ **NotificationsService Expo** (`mobile/src/services/notifications.service.ts`) — register permission + token sync backend + Android channel "Big Boss Fitness" + listeners.
- ⚠️ Backend reçoit le token mais pas de scheduler côté serveur pour rappels entraînement / streak / nouveau live.

---

## 2. Items qui restent vraiment à faire

### 2.1 Bloquants monétisation (priorité 1)

| Item | Phase | Impact |
|---|---|---|
| **Stripe** (cartes internationales) | 1.8 | Bloque tier Premium/Elite |
| **CMI** (cartes marocaines) | 1.8 | Bloque cible marché Maroc |
| **Plans Free / Premium / Elite** (0 / 79 / 149 MAD) | 1.8 | Pas d'écran comparatif |
| **Essai gratuit 30 jours** + webhooks paiement | 1.8 | Pas codé |
| **Upgrade/Downgrade flow** | 1.8 | Pas codé |

### 2.2 Bloquants engagement

| Item | Phase | Statut |
|---|---|---|
| **Firebase FCM réel** (vs Expo push actuel) | 1.9 | Pas migré |
| **Rappels entraînement scheduler** côté backend | 1.9 | Pas de cron |
| **Notifications streak / PR / nouveau live** | 1.9 | Templates existent (DB) mais pas push |
| **Apple Sign In** | 1.1 | Pas codé (Google ok) |

### 2.3 Phase 2 nutrition — gaps

- [ ] Base aliments USDA 800k+ — uniquement Open Food Facts à la volée
- [ ] Base aliments Ciqual / Maroc 3000+ plats locaux
- [ ] Scanner code-barres caméra réel (UI existe, lookup Open Food Facts marche, mais pas de scan caméra natif)
- [ ] Alertes dépassement macros
- [ ] Historique nutrition 90 jours
- [ ] Liste de courses auto à partir du plan semaine
- [ ] Mode Ramadan UI dédié (iftar / suhoor) — toggle existe en onboarding mais pas d'écran spécifique
- [ ] Vidéos préparation recettes
- [ ] Favoris recettes (UI a un bouton heart, backend à vérifier)

### 2.4 Phase 3 — Coach vocal / IA avancée

- [ ] **Voix clonée influenceur ElevenLabs** — service code prêt, manque l'extraction audio + entraînement + déploiement voix
- [ ] **Coaching vocal pendant séance** (comptage reps, encouragements, repos, motivation)
- [ ] **Réponses Darija/Arabe** dans le chat
- [ ] **Messages vocaux** input utilisateur (Whisper)
- [ ] **Claude Vision** sur photos progression / repas (analyse forme corporelle, body fat)
- [ ] **RAG mémoire long terme** coach
- [ ] **Détection démotivation** (analyse sentiment)
- [ ] **Notifications motivation quotidienne audio**

### 2.5 Phase 4 — Contenu

- [ ] **Upload Cloudflare R2 production** — 616 vidéos locales servies via StaticFiles, pas encore pushées sur R2 prod
- [ ] **Tournage influenceur Lot 1** — 100 exercices Excel prêt (`Influenceur_100_Exercices_Recording.xlsx`), pas commencé
- [ ] **334 noms Darija exercices** restants en FR par défaut
- [ ] **Validation kiné** des fiches d'exercices
- [ ] **Photos recettes pro** 101-300 (générées AI pour l'instant)
- [ ] **Vidéos préparation recettes**
- [ ] **IMC / FFMI calcul auto** dans profile/progression
- [ ] **% masse grasse estimation photo IA**
- [ ] **Courbes 1RM 6 mois** (graphiques)
- [ ] **Radar chart musculaire**
- [ ] **Comparateur photos avant/après** (slider)
- [ ] **Chiffrement photos progression AES-256**
- [ ] **Export PDF progression**

### 2.6 Phase 5 — Communauté lourde

- [ ] **Réactions fitness typées** (au lieu d'emojis génériques)
- [ ] **Modération IA** (toxicité, spam)
- [ ] **Signalement contenu** UI
- [ ] **Partage externe** (Instagram, TikTok, WhatsApp)
- [ ] **Gym buddies matching** (recherche, algo compatibilité, chat in-app, carte salles Maroc)
- [ ] **Live streaming Cloudflare** RTMP → HLS adaptatif < 8 s
- [ ] **Lecteur HLS in-app** + chat WebSocket temps réel
- [ ] **Replay intelligent** (horodatage questions)
- [ ] **Dashboard influenceur** (DAU/MAU, courbe croissance, conversion Free→Premium, carte utilisateurs, revenus temps réel)

### 2.7 Phase 6 — Vision IA + e-commerce

- [ ] **MediaPipe Pose natif** (33 keypoints, on-device, latence < 50 ms) — pose-engine logic OK mais pas de capture vidéo temps réel
- [ ] **Overlay AR** (vert/rouge sur articulations)
- [ ] **Comptage reps automatique via caméra**
- [ ] **Score forme 0-100 par rep**
- [ ] **Corrections vocales instantanées**
- [ ] **Score risque blessures quotidien**
- [ ] **Carte corporelle douleurs**
- [ ] **Intégration wearable** (optionnel)
- [ ] **E-commerce mobile** — catalogue produits, détail, panier persistant, paiement Stripe/CMI, tracking commandes (Admin CRUD prêt mais UI mobile shopping absente)

### 2.8 Phase 7 — Beta & launch

- [ ] **Admin dashboard technique** (monitoring CPU/RAM, logs IA tokens + coûts, gestion users, modération, alertes Sentry, rapports facturation)
- [ ] **Beta test privé 500 users** (TestFlight iOS, APK beta Android, feedback in-app, canal Telegram)
- [ ] **Optimisations** (cache Redis agressif, CDN full, cold start < 2 s, crash-free > 99 %, load tests 10K simultanés, optim SQL)
- [ ] **Audit OWASP Top 10** + pen test
- [ ] **Watermark vidéos dynamique** (email user)
- [ ] **Détection screen recording**
- [ ] **Screenshots App Store + Play Store**
- [ ] **Video preview App Store**
- [ ] **Textes App Store FR + AR**
- [ ] **Icône finale 1024×1024**
- [ ] **Privacy policy URL** + age rating
- [ ] **Soumission stores**

### 2.9 Phase 0 — Infrastructure restants

- [ ] **Cloudflare R2 bucket production** réel + clés API
- [ ] **Cloudflare Stream** (vidéos exercices)
- [ ] **Firebase FCM** (cf. 2.2)
- [ ] **Dépôt marque OMPIC** "Big Boss Fitness"
- [ ] **CGU / Politique confidentialité** (loi 09-08 Maroc + RGPD diaspora FR)

---

## 3. Fonctionnalités ajoutées hors roadmap

Items qui n'étaient pas explicitement dans la roadmap mais qui sont implémentés :

- **Refonte design "Atlas & Médina"** — 25+ écrans (voir section 1.1), un upgrade UX majeur.
- **Quick actions Home** — 4 entrées (Badges / Boutique / Communauté / Challenges) toujours visibles, résout le problème de découverte des pages secondaires.
- **Profile-edit screen** — rubriques modifiables non-read-only (genre, poids, taille, objectif, niveau, langue, notifs) + bouton "Modifier" sur le header gradient.
- **Coach Vision pose-engine** — 20 exercices calibrés en TypeScript pur (sans dépendance native), prêts à être branchés sur une caméra.
- **Visual regression tooling Playwright** — `mobile/tests/visual-*.mjs` scripts pour screenshot automatique des écrans (login + nutrition + profile + home + programme + coach + secondary + individual) après login.
- **Fix backend enum serialization** (mappers GOAL_TO_INT / LEVEL_TO_INT côté client car backend .NET n'a pas `JsonStringEnumConverter`).
- **CORS Expo web port 8082** ajouté au fallback Program.cs.

---

## 4. Estimation progression réelle par phase

> Notation honnête en se basant sur "code en place + fonctionnel" vs "encore [ ]".

| Phase | Roadmap 5 avril | Réel 16 mai | Δ | Notes |
|---|---|---|---|---|
| **0 — Setup** | 100 % | **92 %** | -8 | R2 prod / Stream / FCM / OMPIC / CGU manquent |
| **1 — MVP Core** | 99 % | **92 %** | -7 | Google OAuth ✅, profile-edit ✅ ; Apple / Stripe / CMI / watermark / offline restent |
| **1.7 Progression** | (oublié) | **70 %** | — | Mesures + photos OK, mais graphiques avancés / IMC / FFMI / radar manquent |
| **2 — Nutrition** | 98 % | **88 %** | -10 | Recettes 444 ✅, RTL ✅, OFF ✅ ; USDA / Ciqual / Maroc 3k / Ramadan UI / vidéos prep manquent |
| **3 — Coach vocal** | 35 % | **45 %** | +10 | ElevenLabs service ✅, pose-engine 20 exos ✅ ; voix clonée / TTS prod / coaching vocal séance restent |
| **4 — Contenu** | 80 % | **78 %** | -2 | 616 vidéos locales ✅, 287/621 Darija ✅ ; upload R2 / tournage influenceur / 334 Darija restent |
| **5 — Communauté** | 75 % | **62 %** | -13 | Feed back + community UI ✅, challenges ✅, affiliation ✅ ; lives HLS / gym buddies / dashboard influenceur / modération manquent |
| **6 — Vision IA** | 35 % | **45 %** | +10 | pose-engine 20 ✅, boutique back ✅ ; MediaPipe natif / AR / panier mobile / paiement manquent |
| **7 — Beta & launch** | 15 % | **12 %** | -3 | Admin dashboard / beta 500 / audit / soumission stores tous non commencés |
| **Gamification** (transverse) | 100 % | **100 %** | = | Tout fait |
| **Design (hors roadmap)** | — | **95 %** | +95 | Phase 2 design Atlas & Médina terminée |
| **GLOBAL** | **78 %** | **~85 %** | **+7** | Gain net porté par design + gamification |

---

## 5. Recommandations prioritaires

### Sprint court (1-2 semaines) — quick wins

1. **Apple Sign In** — copier le pattern `useGoogleAuth.ts`, ~1-2 jours
2. **Firebase FCM réel** — remplacer Expo push token par FCM token, scheduler backend (rappels entraînement / streak), ~2-3 jours
3. **334 noms Darija restants** — batch GPT-4o-mini via script, ~1 jour
4. **Wirer pose-engine à l'écran `coach-vision.tsx`** avec `expo-camera` + frame capture toutes les N ms, ~3-4 jours
5. **R2 upload des 616 vidéos** — script de migration `videos/` → bucket prod, ~1 jour

### Sprint moyen (2-4 semaines) — monétisation

1. **Stripe + CMI** — controllers Subscriptions, webhooks, plans Free / Premium / Elite, ~4-5 jours
2. **Écrans abonnement mobile** — comparatif, paywall, upgrade flow, ~2 jours
3. **E-commerce mobile complet** — catalogue, détail produit, panier persistant Zustand, checkout, ~5 jours
4. **Admin dashboard technique** — monitoring CPU/RAM, logs IA tokens, modération feed, alertes, ~5 jours
5. **Watermark vidéos** signed URL + overlay email, ~2 jours

### Sprint long (4-8 semaines) — différenciation

1. **Live streaming Cloudflare Stream** — RTMP ingestion, HLS player, chat WebSocket, modération IA, ~8 jours
2. **ElevenLabs voix clonée influenceur** — extraction audio, entraînement, intégration TTS prod, cache audio, ~5 jours
3. **MediaPipe Pose natif** — `@mediapipe/tasks-vision` ou alternative, vrais 33 keypoints, AR overlay, ~10 jours
4. **Dashboard influenceur** — analytics DAU/MAU, conversion, revenus, carte utilisateurs, ~5 jours
5. **Beta test 500 users** — TestFlight + Play internal track + feedback in-app + Telegram, ~3 jours setup + 2-3 semaines de beta

### Critical blockers à traiter en premier

- 🚨 **Paiement** (Stripe + CMI) — sans ça, pas de revenu, pas de tier Premium → bloque monetization
- 🚨 **Firebase FCM** — Expo push fonctionne mais limité, FCM nécessaire pour rappels schedulés côté serveur → bloque rétention
- 🚨 **Cloudflare R2 prod** — vidéos servies en local depuis le backend → pas scalable pour beta 500+

---

## 6. Conclusion

L'app est **visuellement production-ready** (Phase 2 design "Atlas & Médina" majeure et bien exécutée) et **fonctionnellement avancée** (gamification 100 %, 444 recettes traduites, 621 exercices, programmes IA personnalisés, profile-edit, pose-engine 20 exos prêts).

Les **vrais gaps restants** sont concentrés sur :

1. **Monétisation** (Stripe + CMI + plans + paywall) — bloque le revenu
2. **Engagement** (Firebase FCM + scheduler rappels) — bloque la rétention
3. **Différenciation premium** (Coach vocal ElevenLabs + Vision IA MediaPipe natif + Live streaming) — bloque la perception "app premium"
4. **Launch** (admin dashboard technique + audit OWASP + beta 500 + soumission stores) — bloque la mise sur le marché

**Verdict** : si **paiement** + **FCM** + **Apple Sign In** + **R2 prod** sont livrés dans les 2-3 prochaines semaines, l'app est prête pour une **beta privée 500 users** avant fin mai / début juin 2026.

---

*Audit produit automatiquement par Claude Opus 4.7 le 2026-05-16.*

---

# Planning d'exécution détaillé — Big Boss Fitness vers Beta Launch

> Planning sprint-par-sprint pour livrer tous les items "[ ]" restants identifiés section 2 ci-dessus.
> Horizon : 12 semaines (6 sprints de 2 semaines), cible **beta privée 500 users début août 2026**.
> Convention : `J` = jour-personne (dev solo Yassine + Claude).

## Vue d'ensemble timeline

```
Sprint 1 (S1-S2)   QUICK WINS CRITIQUES         18-30 mai 2026
Sprint 2 (S3-S4)   MONÉTISATION                 1-14 juin 2026
Sprint 3 (S5-S6)   ENGAGEMENT & RÉTENTION       15-28 juin 2026
Sprint 4 (S7-S8)   DIFFÉRENCIATION PREMIUM      29 juin - 12 juil 2026
Sprint 5 (S9-S10)  COMMUNAUTÉ AVANCÉE           13-26 juil 2026
Sprint 6 (S11-S12) LAUNCH PREP + BETA           27 juil - 9 août 2026

→ Beta privée 500 users : ouverture 10 août 2026
```

---

## SPRINT 1 — Quick wins critiques (S1-S2, 18-30 mai)

**Objectif** : débloquer le scaling (R2 prod), finir l'auth (Apple), pousser FCM, et brancher pose-engine sur caméra.

### 1.1 Apple Sign In *(2 J)*

- **Pourquoi** : iOS Store l'exige si Google OAuth présent. Bloque soumission App Store.
- **Sous-étapes** :
  1. Installer `expo-apple-authentication` côté mobile
  2. Créer `mobile/src/hooks/useAppleAuth.ts` sur le modèle de `useGoogleAuth.ts`
  3. Ajouter endpoint backend `POST /api/auth/apple` (vérification ID token JWT signé Apple via JWKS)
  4. Wire bouton "Continuer avec Apple" sur login.tsx + register.tsx (au-dessus du Google)
  5. Configurer App ID + Service ID dans Apple Developer Portal
- **Fichiers** : `mobile/src/hooks/useAppleAuth.ts` (nouveau), `mobile/src/app/(auth)/login.tsx`, `backend/.../AuthController.cs`, `backend/.../AuthService.cs`
- **Critères d'acceptation** : un utilisateur peut créer un compte + se connecter via Apple ID sur iOS physique. Token JWT BB délivré.
- **Dépendance** : Apple Developer Account (99 $/an) actif.

### 1.2 Firebase FCM réel *(3 J)*

- **Pourquoi** : Expo push token actuel suffit pour app standalone mais ne supporte pas les notifications schedulées côté serveur (rappels entraînement, streaks).
- **Sous-étapes** :
  1. Créer projet Firebase + ajouter Android + iOS apps
  2. Télécharger `google-services.json` (Android) — déjà présent partiellement
  3. Installer `@react-native-firebase/app` + `@react-native-firebase/messaging`
  4. Adapter `mobile/src/services/notifications.service.ts` pour récupérer FCM token (au lieu d'Expo push token)
  5. Backend : créer `NotificationService.cs` avec `FirebaseAdmin.Messaging` (SDK NuGet)
  6. Endpoint `POST /api/users/push-token` (existe déjà) → stocker FCM token en DB sur l'entité User
  7. Cron service Hangfire : scheduler quotidien "rappel entraînement à 18h selon profile.preferredWorkoutTime"
  8. Templates notifications déjà en DB (`NotificationTemplate` table) → wirer le sender
- **Fichiers** : `mobile/src/services/notifications.service.ts`, `backend/BigBoss.Infrastructure/Services/NotificationService.cs` (nouveau), `backend/BigBoss.API/Program.cs` (Hangfire setup)
- **Critères d'acceptation** : recevoir une notif push sur APK installé déclenchée par un endpoint admin de test.
- **Dépendance** : projet Firebase créé.

### 1.3 Cloudflare R2 upload prod *(2 J)*

- **Pourquoi** : 616 vidéos servies via StaticFiles backend → pas scalable pour 500+ users (bande passante + latence).
- **Sous-étapes** :
  1. Créer bucket R2 `bigboss-videos-prod` + clés API
  2. Script `backend/scripts/upload-r2.py` (existe partiellement `upload_to_r2.py`) → migrer `wwwroot/videos/*` vers R2
  3. Mettre à jour la DB : remplacer `videos/<muscle>/<slug>.mp4` par `https://pub-xxx.r2.dev/...`
  4. SQL : `UPDATE exercises SET video_demo_url = REPLACE(video_demo_url, 'videos/', 'https://pub-xxx.r2.dev/')`
  5. Vérifier `mobile/src/utils/video.ts` (fixVideoUrl) priorise R2 sur local
  6. Garder StaticFiles backend en fallback pendant 1 semaine de transition
- **Fichiers** : `backend/scripts/upload-r2.py`, `scripts/fix-video-urls-to-r2.sql`, `mobile/src/utils/video.ts`
- **Critères d'acceptation** : vidéos exercices se chargent depuis CDN R2 (pas le backend) ; bande passante backend < 100 Mo/jour.

### 1.4 Brancher pose-engine sur caméra réelle *(4 J)*

- **Pourquoi** : `pose-engine.ts` a 20 exercices calibrés mais aucun flux vidéo le nourrit. Coach Vision est vide.
- **Sous-étapes** :
  1. Installer `react-native-vision-camera` (déjà natif dans APK rebuild) ou `expo-camera`
  2. Ajouter `@tensorflow-models/pose-detection` (MoveNet thunder) — choisir entre runtime mediapipe ou tfjs (déjà tfjs installé)
  3. Frame processor : extraire frame à 30 fps → inférer 17 keypoints
  4. Adapter `coach-vision.tsx` : afficher caméra fullscreen + overlay keypoints + score forme + counter reps
  5. Sélecteur d'exercice : dropdown des 20 exos calibrés
  6. Feedback temps réel : utilise `poseEngine.checkPoints()` + `poseEngine.detectRep()`
  7. Audio TTS via expo-speech pour les corrections ("plus bas !", "garde le dos droit")
- **Fichiers** : `mobile/src/app/(main)/sessions/coach-vision.tsx`, `mobile/src/utils/pose-engine.ts` (déjà)
- **Critères d'acceptation** : faire un squat devant la caméra téléphone, compteur de reps incrémente, overlay vert si forme OK, message FR/Darija si erreur.
- **Risque** : performance — fallback MoveNet Lightning si Thunder < 15 fps.

### 1.5 Compléter 334 noms Darija *(1 J)*

- **Pourquoi** : 287/621 exercices ont leur nom Darija, 334 sont en FR par défaut. Cible marché Maroc.
- **Sous-étapes** :
  1. Script `scripts/translate-darija-exercises.py` (déjà existe pour recettes, adapter)
  2. SQL : sélectionner les 334 exos sans Darija (`WHERE name_darija IS NULL OR name_darija = name_fr`)
  3. Batch GPT-4o-mini avec prompt production-grade (utilisé pour recettes 442 OK)
  4. Validation manuelle de 20 échantillons aléatoires
  5. INSERT batch + commit
- **Fichiers** : `scripts/translate-darija-exercises.py`, DB exercises table
- **Critères d'acceptation** : 621/621 exercices ont un nom Darija validé.
- **Dépendance** : clé OpenAI (déjà en place).

**Total Sprint 1 : 12 J ≈ 2 semaines**

---

## SPRINT 2 — Monétisation (S3-S4, 1-14 juin)

**Objectif** : tier Premium activé, paiement Stripe + CMI fonctionnel, paywall en place.

### 2.1 Backend : entités + endpoints subscription *(2 J)*

- **Sous-étapes** :
  1. Entité `Subscription` (UserId, Plan enum {Free, Premium, Elite}, StartedAt, ExpiresAt, StripeSubscriptionId, CmiTransactionId, Status enum {Active, Cancelled, Past_Due, Trial}, AmountMad, RenewalPeriod)
  2. Migration EF Core `AddSubscriptionEntity`
  3. Entité `Payment` (UserId, SubscriptionId, Provider enum {Stripe, Cmi}, Amount, Currency, Status, ProviderTransactionId, CreatedAt, RawWebhookPayload)
  4. `ISubscriptionService` + `SubscriptionService` (`StartTrialAsync`, `UpgradePlanAsync`, `CancelAsync`, `GetCurrentPlanAsync`)
  5. Controller `SubscriptionsController` : `GET /me/subscription`, `POST /me/subscription/upgrade`, `POST /me/subscription/cancel`
- **Fichiers** : `backend/BigBoss.Core/Entities/Subscription.cs`, `backend/BigBoss.Core/Entities/Payment.cs`, `backend/BigBoss.Infrastructure/Services/SubscriptionService.cs`, `backend/BigBoss.API/Controllers/SubscriptionsController.cs`
- **Critères d'acceptation** : Swagger affiche les 3 endpoints + Free/Premium/Elite plan retournable.

### 2.2 Intégration Stripe *(3 J)*

- **Sous-étapes** :
  1. Compte Stripe + clés API (test + live)
  2. NuGet `Stripe.net` dans `BigBoss.Infrastructure`
  3. `StripeService` : `CreateCheckoutSessionAsync(userId, plan)` → retourne URL paiement
  4. Webhook endpoint `POST /api/webhooks/stripe` avec validation signature
  5. Gestion events : `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
  6. Idempotence via Stripe Event ID stocké
  7. Test avec carte Stripe sandbox (4242 4242 4242 4242)
- **Fichiers** : `backend/.../StripeService.cs`, `backend/BigBoss.API/Controllers/WebhooksController.cs`
- **Critères d'acceptation** : un user upgrade depuis Stripe checkout, webhook met à jour Subscription en DB.

### 2.3 Intégration CMI (Crédit du Maroc) *(3 J)*

- **Pourquoi** : 80% des users marocains paient avec carte bancaire CMI / TPE virtuel (Stripe ne marche pas avec MAD direct).
- **Sous-étapes** :
  1. Compte CMI + clés HMAC (production setup peut prendre 2-3 semaines, démarrer en parallèle)
  2. `CmiService` : `BuildPaymentFormAsync(orderId, amountMad)` → retourne HTML form auto-submit POST vers CMI gateway
  3. Endpoint `POST /api/payments/cmi/initiate` → renvoie le HTML form au mobile
  4. WebView mobile pour afficher le form CMI
  5. Callback URL `POST /api/webhooks/cmi/return` avec validation HMAC + redirect vers app via deep link `bigboss://payment-result?status=success`
  6. Test sandbox CMI
- **Fichiers** : `backend/.../CmiService.cs`, `backend/BigBoss.API/Controllers/PaymentsController.cs`, mobile WebView screen
- **Critères d'acceptation** : un user paie 79 MAD via carte marocaine en sandbox, retour app marque Premium actif.
- **Risque** : CMI ouverture compte = délai administratif. À démarrer J1 Sprint 1 en parallèle.

### 2.4 Écrans mobile paywall + abonnements *(3 J)*

- **Sous-étapes** :
  1. Créer `mobile/src/app/(main)/subscription/compare.tsx` — comparatif 3 plans (Free 0 MAD / Premium 79 MAD / Elite 149 MAD) avec table features, gradient hero, CTA "Upgrade"
  2. Créer `mobile/src/app/(main)/subscription/checkout.tsx` — sélecteur Stripe ou CMI, WebView ou redirect
  3. Créer `mobile/src/app/(main)/subscription/success.tsx` — confirmation + animation trophée + retour Home
  4. Service `mobile/src/services/subscription.service.ts` — wrapper API
  5. Store `mobile/src/store/subscription.store.ts` — état Premium/Free, refresh auto au focus
  6. Wire dans Profile screen : tier badge cliquable → `/subscription/compare`
  7. Wire dans Coach chat empty quota : "Upgrade Premium pour messages illimités" → `/subscription/compare`
  8. Wire dans Boutique : "Réserver Premium uniquement" badge
- **Fichiers** : 4 nouveaux écrans + 1 service + 1 store + edits profile.tsx, coach/index.tsx, rewards/index.tsx
- **Critères d'acceptation** : depuis le profil, tap "Free" → écran compare → choisir Premium 79 MAD → CMI checkout → retour app, badge devient "Premium" gold.

### 2.5 Gate des features Premium *(2 J)*

- **Pourquoi** : sans gating, pas de valeur perçue au paiement.
- **Sous-étapes** :
  1. Backend : middleware `RequirePremiumAttribute` sur endpoints Premium
  2. Lister features Free vs Premium vs Elite (dans `gamification_config` table, déjà 23 params)
  3. Free : 5 messages coach/jour, 1 plan généré/semaine, 3 scans repas/jour, pas d'export PDF
  4. Premium : illimité coach, plans illimités, scans illimités, PDF, voix coach
  5. Elite : Premium + sessions live VIP, coaching 1-on-1, custom plan tournage
  6. Mobile : afficher badge "Premium" sur les CTAs gatés, redirect vers paywall au clic
- **Fichiers** : `backend/.../Middlewares/RequirePremiumAttribute.cs`, `mobile/src/components/ui/PremiumBadge.tsx`
- **Critères d'acceptation** : un Free user voit "🔒 Premium" sur 5+ écrans, tap renvoie au paywall.

**Total Sprint 2 : 13 J ≈ 2 semaines (+ 2-3 sem délai admin CMI en parallèle)**

---

## SPRINT 3 — Engagement & Rétention (S5-S6, 15-28 juin)

**Objectif** : pousser les notifications schedulées, finir mode offline log sets, ajouter favoris recettes + ajout journal 1 clic, IMC/FFMI dans profil.

### 3.1 Scheduler backend notifications *(3 J)*

- **Sous-étapes** :
  1. Installer Hangfire + HangfireStorage.PostgreSql
  2. Configurer dashboard `/hangfire` admin-only
  3. Job quotidien `SendWorkoutReminders` : récupère users avec `notificationsEnabled = true` + `lastSessionAt > 24h` → envoie push FCM "Yallah ! Ta séance du jour t'attend 💪"
  4. Job quotidien `SendStreakReminders` : users avec streak > 0 + sans séance aujourd'hui à 20h → push "Ton streak de 7 jours est en danger ! 1 séance pour le maintenir"
  5. Job toutes les 30 min `SendNewLiveNotification` : lives qui démarrent dans 30 min
  6. Job hebdomadaire `SendWeeklyRecap` : dimanche 18h, "Cette semaine : 4 séances, 12.5T volume, +2 PRs"
  7. Utiliser templates DB `NotificationTemplate` (FR + Darija)
- **Fichiers** : `backend/BigBoss.Infrastructure/Jobs/*.cs`, `backend/BigBoss.API/Program.cs`
- **Critères d'acceptation** : 4 jobs visibles dans `/hangfire`, push reçue sur téléphone à l'heure prévue.

### 3.2 Mode offline log sets *(4 J)*

- **Pourquoi** : en salle souvent pas de réseau, perdre une série loggée = frustration.
- **Sous-étapes** :
  1. `mobile/src/store/session.store.ts` : ajouter `pendingOps: SetLog[]` array persisté via Zustand persist
  2. Service API wrap : si offline ou request fail, push dans pendingOps
  3. Background sync : à chaque app focus + reconnect réseau (NetInfo listener), replay pendingOps en série
  4. Indicateur visuel "Sync en cours" / "X sets en attente"
  5. Idempotence côté backend : `SetLogRequest` accepte un `clientUuid` qui dédupe les retry
  6. Conflit resolution : si session backend = Completed mais op en attente, drop l'op + log analytics
- **Fichiers** : `mobile/src/store/session.store.ts`, `mobile/src/services/session.service.ts`, `mobile/src/utils/offline-sync.ts` (nouveau), `backend/.../SessionService.cs` (idempotence)
- **Critères d'acceptation** : mode avion ON, faire 10 sets, mode avion OFF, tous les sets remontent en backend en < 5 s.

### 3.3 Favoris recettes + ajout journal 1 clic *(2 J)*

- **Sous-étapes** :
  1. Backend : entité `UserFavoriteRecipe` (UserId, RecipeId, CreatedAt) déjà en place ? Sinon créer migration
  2. Endpoints `POST/DELETE /api/users/me/favorites/recipes/:id`, `GET /api/users/me/favorites/recipes`
  3. Mobile : `favorites.store.ts` (existe ?) — ajouter `toggleRecipeFavorite(recipeId)`
  4. Bouton heart sur `recipe-detail.tsx` + `recipes.tsx` (liste) → toggle favori
  5. Filtre "Favoris" dans recipes.tsx (déjà chip "Tous", ajouter "Favoris ❤️")
  6. Ajout au journal 1 clic : bouton "Ajouter au déjeuner" / "Ajouter au dîner" dans recipe-detail (déjà partiellement)
- **Fichiers** : `backend/.../Controllers/UsersController.cs`, `mobile/src/store/favorites.store.ts`, `mobile/src/app/(main)/nutrition/recipes.tsx`, `recipe-detail.tsx`
- **Critères d'acceptation** : heart toggle, filtre favoris affiche que mes favoris, tap "Ajouter au dîner" log un repas dans le journal du jour.

### 3.4 IMC + FFMI calcul auto + radar musculaire *(3 J)*

- **Pourquoi** : valorise la section progression, rétention.
- **Sous-étapes** :
  1. Util `mobile/src/utils/body-metrics.ts` : `calcIMC(weight, height)`, `calcFFMI(weight, height, bodyFatPercent)`
  2. Section `Mon IMC` dans progress/index.tsx : valeur + interpretation (sous-poids / normal / surpoids / obèse)
  3. Section `FFMI` : pour les utilisateurs avec body fat % renseigné
  4. Radar chart musculaire : utiliser `react-native-svg` (déjà disponible) — 8 axes (Pecs, Dos, Jambes, Épaules, Bras, Abs, Cardio, Mobilité) basés sur volume hebdomadaire par muscle
  5. Composant `MuscleRadarChart` réutilisable
  6. Backend : endpoint `GET /api/me/muscle-balance` qui retourne `{ Chest: 0.8, Back: 0.6, ... }` (ratio par rapport à objectif équilibré)
- **Fichiers** : `mobile/src/utils/body-metrics.ts`, `mobile/src/components/charts/MuscleRadarChart.tsx`, `mobile/src/app/(main)/progress/index.tsx`, `backend/.../ProgressService.cs`
- **Critères d'acceptation** : ouvrir progression → voir IMC 24.5 (Normal), FFMI 22.1 (Avancé), radar avec 8 sommets affichant équilibre.

### 3.5 Liste de courses auto à partir du plan nutrition *(2 J)*

- **Sous-étapes** :
  1. Backend : endpoint `GET /api/programmes/{id}/grocery-list?week=N` agrège tous les ingredients de tous les repas de la semaine, déduplique + somme quantités
  2. Mobile : écran `programme/grocery-list.tsx` avec checklist (cocher = stocké en localStorage)
  3. Bouton "Liste de courses 🛒" dans programme/nutrition-plan.tsx
  4. Catégories : Légumes / Protéines / Féculents / Épices / Autres
  5. Partage natif (Share API) : exporter en texte pour WhatsApp
- **Fichiers** : `backend/.../ProgrammeService.cs`, `mobile/src/app/(main)/programme/grocery-list.tsx` (nouveau)
- **Critères d'acceptation** : générer la liste pour la semaine en cours, cocher 5 items, sortir + revenir = état checked persisté.

**Total Sprint 3 : 14 J ≈ 2 semaines**

---

## SPRINT 4 — Différenciation Premium (S7-S8, 29 juin - 12 juil)

**Objectif** : Coach Vocal ElevenLabs opérationnel, Coach Vision MediaPipe avec AR overlay, Claude Vision photos progression.

### 4.1 ElevenLabs voix clonée influenceur *(5 J)*

- **Sous-étapes** :
  1. Enregistrer 60 min audio propre influenceur (FR + Darija) — coordination avec influenceur
  2. Upload sur ElevenLabs studio → entraîner "Voice Cloning Pro" → récupérer voice_id
  3. Test qualité sur 10 phrases types (encouragements séance, comptage reps, fin séance)
  4. Adapter `ElevenLabsService.cs` : utiliser le voice_id dynamique, multilingue_v2 ok
  5. Endpoint `POST /api/coach/tts` : input texte → output URL audio MP3 caché R2
  6. Cache aggressive : phrases courantes pré-générées (10-20 phrases) au démarrage
  7. Mesurer latence p95 (cible < 500 ms via cache, < 1500 ms cold)
- **Fichiers** : `backend/.../ElevenLabsService.cs`, `backend/.../Controllers/CoachController.cs`
- **Critères d'acceptation** : depuis l'app, recevoir un message coach en audio influenceur en < 2 s.
- **Dépendance** : disponibilité influenceur pour l'enregistrement.

### 4.2 Coaching vocal pendant séance *(3 J)*

- **Sous-étapes** :
  1. Mobile : nouveau composant `VoiceCoach` dans `sessions/active.tsx`
  2. Triggers :
     - Au début d'une série : "Yallah ! Push 12 reps"
     - À la fin du timer repos : "Allez, série suivante !"
     - Set complété : "Bien joué ! +1 PR potentiel"
     - Fin séance : "Bravo champion 🇲🇦"
  3. Pre-fetch les 4 audio en début séance (cache local)
  4. Toggle "Coach vocal" dans paramètres profil + écran active
  5. Volume controls + ducking (baisser musique Spotify pendant coach)
- **Fichiers** : `mobile/src/app/(main)/sessions/active.tsx`, `mobile/src/components/session/VoiceCoach.tsx`
- **Critères d'acceptation** : pendant une séance, entendre la voix du coach à 4 moments clés, latence ressentie < 1 s.

### 4.3 Coach Vision MediaPipe AR *(5 J)*

- **Pourquoi** : si Sprint 1.4 a livré le squelette, Sprint 4.3 finalise l'expérience premium.
- **Sous-étapes** :
  1. Overlay SVG : tracer les 17 keypoints en cercles colorés vert (forme OK) / rouge (correction nécessaire)
  2. Tracer les segments (épaule-coude-poignet etc.) en lignes blanches
  3. Indicateur visuel d'angle (texte "115°" près du coude par exemple) pour exercices comme curl
  4. Compteur reps gros et animé en bas
  5. Bouton "Calibrer" si keypoints flous (< 0.3 confidence sur 50% des points)
  6. Score forme 0-100 par rep, moyenne globale fin de série
  7. Audio TTS : "Plus bas !", "Genoux alignés !", "Excellent !" (utilise ElevenLabs voix clonée)
  8. Mode économie batterie : downsample à 15 fps si CPU > 70%
- **Fichiers** : `mobile/src/app/(main)/sessions/coach-vision.tsx`
- **Critères d'acceptation** : faire 5 squats devant la caméra, overlay AR fonctionne, compteur affiche 5, score moyen 78/100, 1 correction vocale entendue.

### 4.4 Claude Vision photos progression *(2 J)*

- **Sous-étapes** :
  1. Endpoint `POST /api/progress/photos/:id/analyze` : prend photo URL, envoie à Claude Vision avec prompt structuré ("Estime body fat %, posture, masse musculaire visible")
  2. Stocker analyse en DB sur `ProgressPhoto.aiAnalysis` (champ JSONB existant)
  3. Mobile : bouton "Analyser avec IA" dans progress/photos
  4. Affichage : "Body fat estimé : ~15%", "Recommandation : focus dos cette semaine"
  5. Rate limit Premium uniquement (Claude Vision = cher)
- **Fichiers** : `backend/.../ProgressService.cs`, `mobile/src/app/(main)/progress/index.tsx`
- **Critères d'acceptation** : uploader une photo profil, taper "Analyser", recevoir une analyse texte en 3-5 s.

**Total Sprint 4 : 15 J ≈ 2 semaines (chargé)**

---

## SPRINT 5 — Communauté avancée (S9-S10, 13-26 juillet)

**Objectif** : feed social opérationnel avec modération, gym buddies matching, live streaming Cloudflare.

### 5.1 Feed social complet avec modération IA *(4 J)*

- **Sous-étapes** :
  1. Backend (déjà partiel) : finir Posts CRUD, Reactions typées (Fire/Muscle/Lightning/Trophy), Comments threadés
  2. Modération IA : middleware `POST /api/feed` qui appelle Claude pour scorer toxicité (0-1) ; si > 0.7 → flag pour review admin
  3. Endpoint `POST /api/feed/:id/report` : signalement utilisateur
  4. Mobile feed : timeline déjà refondue → ajouter compose améliorée (texte + photo upload R2), pull-to-refresh, infinite scroll
  5. Sous-écran `community/post/:id` pour détail + thread commentaires
  6. Partage externe : Share API native pour Instagram Stories / WhatsApp
- **Fichiers** : `backend/.../FeedController.cs` + `FeedService.cs`, `mobile/src/app/(main)/community/index.tsx`, `community/post.tsx`
- **Critères d'acceptation** : poster un PR avec photo, voir dans timeline, recevoir 3 réactions de testeurs, modérer post toxique côté admin.

### 5.2 Gym buddies matching *(4 J)*

- **Sous-étapes** :
  1. Entité `BuddyProfile` (UserId, City, GymName?, Goals, AvailableSlots, Bio, Visible)
  2. Algo matching : score basé sur ville + niveau + objectif + horaires communs
  3. Endpoint `GET /api/buddies/recommended` : top 20 matches
  4. Endpoint `POST /api/buddies/connect/:userId` : demande de connexion + notif push
  5. Mobile : `community/buddies.tsx` écran avec swipe-cards style (gauche/droite)
  6. Chat 1-on-1 : réutiliser CoachMessage entity avec `targetUserId` + adapter UI chat coach
  7. Carte des salles Maroc : intégration Google Maps Static API + DB des grandes salles (Casa, Marrakech, Rabat, Tanger, Fes)
- **Fichiers** : `backend/.../BuddyController.cs`, `backend/.../BuddyService.cs`, `mobile/src/app/(main)/community/buddies.tsx` (nouveau)
- **Critères d'acceptation** : 5 matches affichés, demande de connexion envoyée, chat fonctionne entre 2 testeurs.

### 5.3 Live streaming Cloudflare Stream *(5 J)*

- **Sous-étapes** :
  1. Compte Cloudflare Stream + clés API
  2. Backend : endpoint `POST /api/lives/:id/start-stream` → crée live input Cloudflare, retourne RTMP URL pour OBS, playback URL HLS pour viewers
  3. Adapter `LivesController` : push event "live démarré" + notif push à tous les abonnés
  4. Mobile : écran `lives/[id]` avec lecteur HLS (`expo-av` Video component supporte HLS)
  5. Chat temps réel : WebSocket avec ASP.NET Core SignalR
  6. Hub `LiveChatHub` : `JoinLiveAsync(liveId)`, `SendMessageAsync(liveId, content)`
  7. Modération IA des messages chat (auto-mute si toxicité > 0.8)
  8. Compteur viewers temps réel + likes
  9. Replay : Cloudflare Stream enregistre auto, URL replay stockée en DB
- **Fichiers** : `backend/.../LivesController.cs`, `backend/.../Hubs/LiveChatHub.cs`, `mobile/src/app/(main)/lives/[id].tsx`
- **Critères d'acceptation** : influenceur stream depuis OBS → URL RTMP CF, 50 viewers regardent en HLS, chat fonctionne, replay dispo 1 h après fin.

### 5.4 Dashboard influenceur *(3 J)*

- **Sous-étapes** :
  1. Page admin `admin/app/influencer/page.tsx`
  2. Widgets : DAU (Daily Active Users), MAU, courbe croissance 30 jours, taux conversion Free→Premium (%), carte heatmap utilisateurs Maroc par ville
  3. Revenus temps réel (somme Subscription.AmountMad du mois)
  4. Top 10 challenges actifs + engagement
  5. Top 10 recettes les plus consommées
  6. Bouton "Lancer un live" + "Créer un challenge"
- **Fichiers** : `admin/app/influencer/page.tsx`, `backend/.../AdminAnalyticsController.cs`
- **Critères d'acceptation** : dashboard charge en < 3 s, montre DAU, MAU, revenus, conversion.

**Total Sprint 5 : 16 J ≈ 2 semaines (chargé)**

---

## SPRINT 6 — Launch prep + Beta (S11-S12, 27 juil - 9 août)

**Objectif** : admin dashboard technique, optimisation Redis, audit OWASP, soumission stores, ouverture beta.

### 6.1 Admin dashboard technique *(3 J)*

- **Sous-étapes** :
  1. Page `admin/app/monitoring/page.tsx`
  2. Widgets : CPU/RAM serveur (depuis `/health/detailed`), Requêtes/min, latence p50/p95, taux d'erreur 5xx
  3. Logs IA : tokens consommés par jour (Claude + GPT-4o-mini + ElevenLabs), coût $ estimé
  4. Gestion utilisateurs : recherche, suspendre, refund, voir historique sessions
  5. Modération : queue de posts flagués + buttons "Approve" / "Reject" / "Ban user"
  6. Alertes Sentry : intégration `Sentry.AspNetCore` backend + `sentry-expo` mobile
  7. Envoyer notif push manuelle (test)
- **Fichiers** : `admin/app/monitoring/page.tsx`, `admin/app/users/page.tsx`, `backend/.../AdminController.cs`
- **Critères d'acceptation** : voir CPU 35%, 10 logs IA dernière heure, suspendre un user test = compte désactivé.

### 6.2 Cache Redis agressif *(2 J)*

- **Sous-étapes** :
  1. Installer Redis cache `Microsoft.Extensions.Caching.StackExchangeRedis`
  2. Wrapper `ICacheService` avec `GetOrSetAsync<T>(key, factory, ttl)`
  3. Cache : exercices liste (1 h), recettes liste (1 h), exercise détail (24 h), recipe détail (24 h)
  4. Invalidation : sur PUT/DELETE de l'admin
  5. Mesurer hit ratio (cible > 80% sur endpoints listés)
- **Fichiers** : `backend/.../CacheService.cs`, edits dans controllers liste
- **Critères d'acceptation** : `/api/exercises` répond en < 50 ms (vs ~300 ms cold), hit ratio Redis > 80%.

### 6.3 Audit sécurité OWASP Top 10 *(3 J)*

- **Sous-étapes** :
  1. Scan ZAP OWASP automatique
  2. Vérifier injection SQL (EF Core paramétré, OK normalement)
  3. Vérifier XSS dans admin (Next.js auto-escape, OK normalement)
  4. CSRF tokens sur endpoints sensibles (POST account delete, etc.)
  5. Rate limiting : déjà en place 500/min général + 50/min IA — vérifier seuils
  6. Headers sécurité : `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`
  7. Watermark vidéos dynamique : signed URL avec param `?u=<userId>&exp=<ts>` → overlay texte côté player (mobile player utilise prop watermark)
  8. Détection screen recording iOS : `react-native-screen-record-detector`
  9. Chiffrement photos progression AES-256 : middleware côté backend qui chiffre avant stockage R2, clé dérivée userId+secret
- **Fichiers** : `backend/.../Middlewares/SecurityHeadersMiddleware.cs`, `mobile/src/components/SecureVideo.tsx`
- **Critères d'acceptation** : rapport ZAP zéro vuln HIGH, watermark visible sur vidéo, photos chiffrées en R2.

### 6.4 Soumission App Store + Play Store *(3 J)*

- **Sous-étapes** :
  1. Screenshots 5 écrans clés (Home, Programme, Coach, Recettes, Profile) pour 3 tailles iOS + Android
  2. Video preview 30s App Store (capture + montage)
  3. Textes : description courte, longue, mots-clés (FR + AR)
  4. Icône finale 1024×1024 + adaptive icon Android
  5. Privacy policy URL hosted (page Next.js admin?)
  6. Age rating questionnaire
  7. EAS Submit : `eas submit --platform ios` + `eas submit --platform android`
  8. Test interne TestFlight (50 testers) + Play Internal Testing
- **Fichiers** : `mobile/assets/store-screenshots/*`, `mobile/eas.json` (submit profile)
- **Critères d'acceptation** : 2 apps en review chez Apple + Google.

### 6.5 Beta privée 500 users *(3 J)*

- **Sous-étapes** :
  1. Landing page d'inscription beta (peut être page admin publique `admin/app/beta/page.tsx`)
  2. Email automatique avec lien TestFlight invitation / Play Beta link
  3. Formulaire feedback in-app : screen `(main)/feedback.tsx` avec note 1-5 + texte + screenshot auto
  4. Canal Telegram / WhatsApp privé pour beta testers
  5. Tracking bugs via GitHub Issues (label `beta-feedback`)
  6. Sessions test utilisateurs : 5 entretiens 30 min skype hebdo
- **Fichiers** : `admin/app/beta/page.tsx`, `mobile/src/app/(main)/feedback.tsx`
- **Critères d'acceptation** : 100+ inscrits au lancement beta J1, 500 atteint J7, feedback in-app reçu.

**Total Sprint 6 : 14 J ≈ 2 semaines**

---

## Récap planning + budget temps total

| Sprint | Semaines | Jours-personne | Livrables clés |
|---|---|---|---|
| 1 | S1-S2 (18-30 mai) | 12 J | Apple Sign In, FCM, R2 prod, pose-engine caméra, Darija complet |
| 2 | S3-S4 (1-14 juin) | 13 J | Stripe + CMI + paywall + plans + gating Premium |
| 3 | S5-S6 (15-28 juin) | 14 J | Scheduler notif, offline log sets, favoris recettes, IMC/FFMI/radar, liste courses |
| 4 | S7-S8 (29 juin - 12 juil) | 15 J | ElevenLabs voix clonée, coaching vocal séance, MediaPipe AR, Claude Vision photos |
| 5 | S9-S10 (13-26 juil) | 16 J | Feed social complet, gym buddies, live streaming Cloudflare, dashboard influenceur |
| 6 | S11-S12 (27 juil - 9 août) | 14 J | Admin technique, Redis, audit OWASP, soumission stores, ouverture beta 500 |
| **Total** | **12 semaines** | **84 J** | **Beta privée 500 utilisateurs prête le 10 août 2026** |

## Hypothèses & risques

- **Hypothèse 1** : un seul dev solo (Yassine) + IA support, ~7 J productifs / semaine (week-end inclus).
- **Hypothèse 2** : pas de feature creep — toute nouvelle demande hors-roadmap décalée post-beta.
- **Risque 1** : CMI ouverture compte = délai 2-4 semaines admin → **démarrer dossier J1 Sprint 1**.
- **Risque 2** : Apple Developer Account + tests TestFlight = 24-48h validation → démarrer Sprint 1.
- **Risque 3** : disponibilité influenceur pour 60 min audio + tournage vidéos = à caler tôt (Sprint 3 idéal).
- **Risque 4** : performance MediaPipe sur téléphones d'entrée de gamme → tester sur 3 modèles Android avant Sprint 4.

## Critères "Beta launch ready" (10 août 2026)

- [ ] 5 méthodes auth (Email, Google, Apple, optionnellement WhatsApp via Twilio plus tard)
- [ ] Paiement Stripe (international) + CMI (Maroc) fonctionnels
- [ ] 3 plans (Free / Premium 79 MAD / Elite 149 MAD) avec features gatées
- [ ] Push notifications FCM réelles + scheduler quotidien
- [ ] Coach Vocal avec voix influenceur (latence < 1.5 s)
- [ ] Coach Vision avec 20 exercices AR temps réel
- [ ] Feed social avec modération IA
- [ ] Live streaming HLS + chat WebSocket
- [ ] Vidéos sur Cloudflare R2 production
- [ ] Admin dashboard technique opérationnel
- [ ] Audit OWASP zéro vuln HIGH
- [ ] Apps soumises App Store + Play Store (en review)
- [ ] Landing beta avec 500 inscrits

---

*Planning produit par Claude Opus 4.7 le 2026-05-16. À ajuster selon réalité du sprint en cours.*
