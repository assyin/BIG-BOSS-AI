# Workflow vidéos influenceur — Big Boss Fitness

> Procédure complète quand l'influenceur livre ses 100 vidéos tournées.

## Vue d'ensemble

L'influenceur enregistre **100 vidéos d'exercices** (1 par exercice) selon le fichier `Influenceur_100_Exercices_Recording.xlsx` à la racine du repo. Chaque vidéo respecte la convention :

```
INF_<muscle>_<slug>.mp4
```

Exemples :
- `INF_chest_dips.mp4`
- `INF_back_lat-pulldown.mp4`
- `INF_legs_squat-barbell.mp4`

## Étape 1 — Réception

1. L'influenceur livre les vidéos (Drive, WeTransfer, USB, etc.)
2. Tu télécharges et tu colles **TOUS** les fichiers dans `influencer-videos/` à la racine du repo (créé automatiquement)
3. Vérifie le nommage : chaque fichier doit commencer par `INF_` et matcher l'Excel

## Étape 2 — Dry-run (preview obligatoire)

```bash
py scripts/upload_influencer_videos.py
```

Le script affiche :
- Combien de fichiers sont attendus (Excel) : 100
- Combien sont présents localement
- Combien sont matchés (uploadables)
- Combien sont inconnus (mauvais nommage)
- Combien manquent encore

Exemple output :
```
✓ Matched (à uploader): 47
? Inconnu (pas dans Excel): 2
  Manquant (Excel demande mais absent local): 51
```

Si tu vois des "Inconnus", **renomme-les** d'abord avant d'aller plus loin.

## Étape 3 — Upload réel

Quand le dry-run est satisfaisant :

```bash
py scripts/upload_influencer_videos.py --apply
```

Pour chaque vidéo, le script :
1. Upload vers Cloudflare R2 sous le préfixe `influencer/<muscle>/<slug>.mp4`
2. Update la DB : `UPDATE exercises SET video_demo_url = '<R2 URL>' WHERE id = '<UUID Excel>'`
3. L'ancienne URL YMove/locale est remplacée

L'upload se fait avec **4 connexions parallèles** par défaut (modifiable via `--concurrency N`).

## Étape 4 — Vérification

Après upload, vérifie en DB :

```bash
docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -c \
  "SELECT COUNT(*) FROM exercises WHERE video_demo_url LIKE '%influencer/%';"
```

Tu dois voir le compteur égal au nombre de fichiers uploadés.

## Options avancées

### Choisir le champ à updater

Si l'influenceur tourne des vidéos supplémentaires (form, mistakes, tips) :

```bash
py scripts/upload_influencer_videos.py --apply --field video_form_url
py scripts/upload_influencer_videos.py --apply --field video_mistakes_url
py scripts/upload_influencer_videos.py --apply --field video_tips_url
```

### Dossier alternatif

Si les vidéos arrivent dans un autre dossier :

```bash
py scripts/upload_influencer_videos.py --apply --dir D:/livraison-mai
```

### Concurrence

Pour 100 fichiers ~50 MB chacun, 4 connexions = ~10-15 min. Augmente si la fibre/bandwidth le permet :

```bash
py scripts/upload_influencer_videos.py --apply --concurrency 8
```

## Conventions naming Excel

Le script lit `Influenceur_100_Exercices_Recording.xlsx`, feuille `100 Exercices`. Les colonnes utilisées :

| Colonne | Usage |
|---|---|
| H — Nom Fichier à Enregistrer | `INF_<muscle>_<slug>.mp4` (match exact) |
| J — ID Base de Données | UUID exercice (cible UPDATE) |
| B — Muscle (FR) | Info display seulement |
| E — Nom Français | Info display seulement |

**NE PAS MODIFIER la colonne H ou J**, sinon le matching casse.

## R2 setup

Les credentials sont lus depuis `backend/.env` :
- `BBF_R2_ENDPOINT`
- `BBF_R2_ACCESS_KEY_ID`
- `BBF_R2_SECRET_ACCESS_KEY`
- `BBF_R2_BUCKET`
- `BBF_R2_PUBLIC_URL` (base URL pour les fichiers publics)

Le bucket actuel : `https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/`

## Troubleshooting

| Symptôme | Cause | Fix |
|---|---|---|
| `Missing dependency: boto3` | Lib pas installée | `pip install boto3 openpyxl` |
| `Excel introuvable` | Tu as déplacé le fichier | Restaure-le à la racine |
| `unknown` files | Mauvais nommage | Renomme selon `INF_<muscle>_<slug>.mp4` |
| Upload timeout | Réseau lent | Baisse `--concurrency 2` |
| `SQL update failed` | UUID Excel obsolète | Vérifie que l'exercice existe en DB |

## Rollback

Si tu veux annuler un upload (URL DB à restaurer) :

```sql
-- Garde toujours un backup avant !
SELECT id, name_fr, video_demo_url
FROM exercises
WHERE video_demo_url LIKE '%influencer/%';
```

Puis restaure manuellement les anciennes URLs depuis un dump DB pré-upload.
