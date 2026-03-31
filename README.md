# Big Boss Fitness

Application mobile de musculation propulsee par l'Intelligence Artificielle pour le marche marocain.

## Stack Technique

- **Backend**: ASP.NET Core 8 (C#)
- **Mobile**: React Native + Expo
- **Admin**: Next.js 14
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **IA**: Claude API (Anthropic) + GPT-4o (OpenAI)
- **Storage**: Cloudflare R2
- **Voice**: ElevenLabs

## Structure du Projet

```
big-boss-fitness/
├── backend/              # API ASP.NET Core
│   ├── BigBoss.API/      # Controllers, Middlewares
│   ├── BigBoss.Core/     # Entities, DTOs, Interfaces
│   ├── BigBoss.Infrastructure/  # Services, Repositories
│   └── BigBoss.Tests/    # Tests unitaires
├── mobile/               # App React Native Expo
├── admin/                # Dashboard Next.js
└── docker-compose.yml    # PostgreSQL + Redis
```

## Demarrage Rapide

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### 1. Cloner et configurer

```bash
git clone <repo-url>
cd big-boss-fitness

# Copier les variables d'environnement
cp .env.example .env
# Editer .env avec vos cles API
```

### 2. Lancer les services (PostgreSQL + Redis)

```bash
docker-compose up -d
```

### 3. Lancer le Backend

```bash
cd backend
dotnet restore
dotnet build
dotnet run --project BigBoss.API
```

L'API sera disponible sur http://localhost:5000
Swagger UI: http://localhost:5000/swagger

### 4. Lancer l'App Mobile

```bash
cd mobile
npm install
npx expo start
```

Scanner le QR code avec Expo Go sur votre telephone.

### 5. Lancer l'Admin (optionnel)

```bash
cd admin
npm install
npm run dev
```

Dashboard disponible sur http://localhost:3000

## Commandes Utiles

### Backend

```bash
# Build
dotnet build BigBoss.sln

# Tests
dotnet test BigBoss.Tests

# Migrations EF Core
dotnet ef migrations add <NomMigration> --project BigBoss.Infrastructure --startup-project BigBoss.API
dotnet ef database update --project BigBoss.Infrastructure --startup-project BigBoss.API
```

### Mobile

```bash
# Demarrer Expo
npx expo start

# Build iOS (necessite Mac)
eas build --platform ios

# Build Android
eas build --platform android
```

### Docker

```bash
# Demarrer PostgreSQL + Redis
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arreter
docker-compose down

# Reset complet (supprime les donnees)
docker-compose down -v
```

## Variables d'Environnement

Voir `.env.example` pour la liste complete des variables requises.

### Variables Critiques

| Variable | Description |
|----------|-------------|
| `BBF_DATABASE_URL` | Connection string PostgreSQL |
| `BBF_JWT_SECRET` | Cle secrete JWT (min 32 chars) |
| `BBF_CLAUDE_API_KEY` | Cle API Anthropic |
| `BBF_CLOUDFLARE_R2_*` | Credentials Cloudflare R2 |

## Architecture

### Backend (Clean Architecture)

```
BigBoss.API         → Controllers, Middlewares, Program.cs
    ↓
BigBoss.Core        → Entities, DTOs, Interfaces (aucune dependance)
    ↓
BigBoss.Infrastructure → Services, Repositories, DbContext
```

### Mobile (Feature-based)

```
src/
├── app/            # Expo Router (screens)
├── components/     # Composants reutilisables
├── services/       # Appels API
├── store/          # Zustand state management
├── types/          # TypeScript types
└── constants/      # Couleurs, config
```

## Conventions de Code

### Backend C#

- PascalCase: Classes, Methodes, Proprietes
- camelCase: Variables locales, parametres
- snake_case: Colonnes base de donnees
- Interfaces prefixees par `I`

### Mobile TypeScript

- PascalCase: Composants
- camelCase: Fonctions, variables
- kebab-case: Noms de fichiers
- Strict mode TypeScript (zero `any`)

### Git Commits

```
feat: nouvelle fonctionnalite
fix: correction de bug
refactor: refactoring sans changement fonctionnel
docs: documentation
test: ajout/modification de tests
chore: maintenance, dependencies
```

## Licence

Projet prive et confidentiel.
(c) 2026 Big Boss Fitness. Tous droits reserves.
