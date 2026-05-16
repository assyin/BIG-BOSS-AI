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
