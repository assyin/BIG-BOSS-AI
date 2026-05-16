# Prompt de continuation pour Claude — Big Boss Fitness

> Copie-colle ce document entier comme premier message à Claude dans une nouvelle session sur ton PC Windows.

---

Salut. Je m'appelle Yassine (alias `assyin`), je développe **Big Boss Fitness**, une SaaS fitness marocaine. Je viens de migrer mon dev sur ce PC Windows natif (avant j'étais sur WSL Ubuntu sur un autre PC). On va continuer le travail ici. Voici tout le contexte dont tu as besoin.

## Stack & emplacements

- **Repo local:** `C:\Projects\BIG-BOSS-AI`
- **Repo GitHub:** https://github.com/assyin/BIG-BOSS-AI (privé, branche `master`)
- **Backend** (.NET 8): `backend\BigBoss.API` — port **5050** (Swagger sur `/swagger`)
- **Admin web** (Next.js): `admin\` — port **3000**
- **Mobile** (Expo + React Native + dev-client): `mobile\` — Metro port **8081**
- **Postgres** (Docker): `bigboss-postgres`, port **5433** (PAS 5432 — conflit avec un autre projet `darija_pg`)
- **Redis** (Docker): `bigboss-redis`, port **6380**

## Login admin (web et mobile)

- Email: `yassine@gmail.com`
- Password: `Admin123!`
- Role: 1 (Admin)
- bcrypt hash en DB: `$2b$11$8YLYss9WMKXZi93g7WTsjOQbglu/p7OldctW9TcstmrTSe0PGIQs2`

## Procédure de démarrage quotidienne

1. Lancer **Docker Desktop**, attendre baleine verte
2. PowerShell: `docker start bigboss-postgres bigboss-redis`
3. Terminal 1: `cd C:\Projects\BIG-BOSS-AI\backend\BigBoss.API; dotnet run`
4. Terminal 2: `cd C:\Projects\BIG-BOSS-AI\admin; npm run dev`
5. Terminal 3 (mobile): `cd C:\Projects\BIG-BOSS-AI\mobile; npx expo start --dev-client --host lan -c`
6. Téléphone sur même Wi-Fi, ouvrir l'APK BigBoss dev installé

Si `dotnet` introuvable dans un nouveau terminal: `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`

## Variables d'environnement importantes

- `backend\.env` — contient ports 5433/6380, JWT, clés API (OpenAI, ElevenLabs, R2)
- `mobile\src\constants\api.ts` — IP Windows hardcodée (`192.168.100.213`). Si IP change, modifier ce fichier
- `admin\.env.local` — contient `NEXT_PUBLIC_API_URL=http://localhost:5050`
- `ASPNETCORE_ENVIRONMENT=Development` est dans `backend\.env` (sinon Swagger off)

## Refonte design marocaine en cours

**Document spec:** `DESIGN_REDESIGN_MOROCCAN.md` (652 lignes) — c'est LA bible du redesign "Atlas & Médina". Lis-le si tu touches à du design.

### Phase 1 — TERMINÉE
- Palette couleurs Moroccan dans `mobile\src\constants\colors.ts` (16 tokens: primary Terre Marrakech `#C84B31`, secondary Bleu Médina `#2E5A87`, accent Vert Atlas `#4A7C59`, gold Safran `#D4A24C`, neutrals Tadelakt, etc.)
- Typographie Cairo (display) + Inter (body) + Tajawal (arabe) chargées via `@expo-google-fonts/*` dans `mobile\src\app\_layout.tsx`

### Phase 2 — EN COURS
- ✅ Login + Register (Logo full + "Made in Morocco 🇲🇦" + bg beige tadelakt)
- ✅ SplashHero racine (mais sans LinearGradient/ZelligePattern — bloqué par APK actuel, voir limites natives ci-dessous)
- ✅ Composants UI: Button (radius 14 + warm shadow + Cairo), Card (radius 18 + border tadelakt), Input (radius 14 + border 1.5 + focus glow)
- ✅ Home header: greeting "السلام {firstName} 👋" en Cairo h2, avatar avec bordure dorée
- ✅ Tab bar: bg beige, réduit de 7 à 5 onglets (Home, Séances, Nutrition, Coach, Profil)
- ✅ Onboarding: 3 slides avec textes Maroc ("Made in Morocco", "شويا بشويا", "Casa/Marrakech"), bouton "Yallah, on commence!", dots actifs en doré safran
- 🔲 **Nutrition / recipes** — à refondre (tag "Recette Marocaine 🇲🇦", icône tagine)
- 🔲 **Coach chat** — bulles user en bleu médina, bulles coach en rouge terre
- 🔲 **Profile screen** — avatar dégradé + bordure zellige
- 🔲 **Programme detail** — calendrier avec accents dorés sur PR
- 🔲 **Shop / Rewards** — header zellige, tag premium doré

### Composants brand existants (déjà créés mais sous-utilisés)
Dans `mobile\src\components\brand\`:
- `Logo.tsx` — étoile à 8 pointes CSS pure (variants: mark / full / splash). **Utilise des Views, marche sans SVG natif.**
- `BerberPattern.tsx`, `ZelligePattern.tsx`, `MoroccanIcons.tsx`, `SplashHero.tsx` — **utilisent `react-native-svg` qui N'EST PAS dans l'APK actuel** (voir limites ci-dessous)

## ⚠️ Limites techniques actuelles

L'APK dev sur le téléphone a été buildé AVANT l'ajout de certains modules natifs. Donc:
- ❌ **`expo-linear-gradient`** non disponible — utiliser fonds solides au lieu de gradients
- ❌ **`react-native-svg`** non disponible — pas de patterns SVG (Zellige, Berber) ni d'icônes custom dans MoroccanIcons
- ✅ Tout le reste fonctionne (couleurs, polices Cairo/Inter, Logo CSS, composants UI standards)

**Tentative de rebuild EAS hier:** `eas build --platform android --profile development --local` a échoué avec `npm ci --include=dev exited with non-zero code: 1`. Cause probable: conflit peer deps entre `@tensorflow/tfjs-react-native@1.0.0` (veut `expo-camera@^13`) et `expo-camera@~17.0.10`. Pistes:
- Ajouter `.npmrc` avec `legacy-peer-deps=true` au niveau de `mobile\`
- OU downgrader `expo-camera` à v13
- OU supprimer `@tensorflow/tfjs-react-native` si inutilisé
- OU passer en EAS Cloud build à la place de local

## Vidéos / Cloudflare R2

- Hébergement: `https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/` (public, mêmes paths que ancien local `videos/`)
- DB Windows déjà migrée: les colonnes `video_demo_url`, `thumbnail_url`, `PhotoUrl`, `VideoUrl` etc. pointent vers R2 (script `scripts\fix-video-urls-to-r2.sql` déjà exécuté)
- 621 exercices en DB, 443 recettes

## Préparation influenceur (en cours)

Fichier `Influenceur_100_Exercices_Recording.xlsx` à la racine du repo:
- 100 exercices sélectionnés avec FR + Darija auto + URL vidéo référence Cloudflare + nom de fichier conventionnel (`INF_<muscle>_<slug>.mp4`)
- 3 feuilles: liste, workflow, guidelines techniques
- L'influenceur a reçu les instructions hier, recording à venir

Quand les vidéos arrivent: renommer en `<muscle>/<slug>.mp4`, puis upload via `scripts/upload_to_r2.py` (script existant, lit les credentials R2 depuis `backend\.env`).

## 🔴 Sécurité — pas encore traité

- **Token GitHub `ghp_idijCO...`** exposé hier dans le chat — à révoquer sur https://github.com/settings/tokens
- **Clé OpenAI `sk-proj-7lcEdQpt...`** dans `backend\.env` — était dans l'historique git (scrubbée via filter-repo mais a fuité), à révoquer sur https://platform.openai.com/api-keys puis remplacer dans le `.env`

## Mes préférences de travail

- Langue principale: **français**, parfois darija
- **Une commande par ligne** dans les blocs code (mon terminal a tendance à découper les commandes trop longues lors du copier-coller)
- Je suis chill mais j'aime aller vite — pas besoin d'explications longues, focus sur l'action
- Quand tu commit, ajoute toujours `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Pas d'emoji dans le code source sauf si je demande
- Pour Darija → arabe, tu utilises Cairo/Tajawal fonts, mes propres traductions ne sont pas natives donc demander à l'influenceur de valider quand pertinent

## Workflow git

Repo a `git push` configuré sur master direct (pas de PR ni branches pour le moment, projet solo). Workflow:
1. `git pull` en début de session
2. Bosser
3. `git add -A && git commit -m "..." && git push` à la fin
4. Tu peux commit/push direct quand on finit un changement logique

## Par où commencer cette session

Demande-moi par quoi tu veux que je commence parmi les pending Phase 2:
1. Nutrition / recipes (impact élevé — écran très visité)
2. Coach chat (signature feature)
3. Profile screen (utilisateur)
4. Régler le rebuild APK (débloque SVG patterns + gradients)
5. Autre

Si je dis "rappelle-moi où on en est" — relis ce document, plus le dernier `git log --oneline -10` et propose-moi un état des lieux.

---

**Maintenant, dis-moi par quoi on commence aujourd'hui.**
