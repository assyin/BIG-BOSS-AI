# Big Boss Fitness - Plan Onboarding Premium
## Collecte Intelligente des Donnees Utilisateur

---

**Version**: 1.0
**Date**: 30 Mars 2026
**Objectif**: Creer un profil ultra-personnalise pour chaque utilisateur des la premiere utilisation

---

## 1. VISION GLOBALE

L'onboarding est le moment le plus critique de l'app. C'est ici que l'on collecte TOUTES les informations necessaires pour creer une experience 100% personnalisee.

**Principe**: Chaque donnee collectee a un IMPACT DIRECT sur les recommandations de l'app.

**Inspiration**: MyFitnessPal, Freeletics, Noom, Renaissance Periodization, MacroFactor

---

## 2. DONNEES A COLLECTER (12 Etapes)

### Etape 1: Identite de base
| Donnee | Type | Obligatoire | Pourquoi |
|--------|------|-------------|----------|
| Prenom | Text | Oui | Personnalisation messages IA |
| Date de naissance | Date | Oui | Calcul age → adapte intensite, recuperation |
| Genre | Select (Homme/Femme/Autre) | Oui | Calcul TDEE, distribution hormonale, recommendations |

**Impact sur l'app:**
- Age < 18: pas d'exercices trop lourds, pas de regime restrictif
- Age > 40: plus de mobilite, echauffement renforce, repos allonge
- Genre: calcul metabolisme de base different (Harris-Benedict), repartition graisses

---

### Etape 2: Mensurations physiques
| Donnee | Type | Obligatoire | Pourquoi |
|--------|------|-------------|----------|
| Poids actuel (kg) | Number | Oui | Calcul TDEE, IMC, charges recommandees |
| Taille (cm) | Number | Oui | Calcul IMC, TDEE |
| Tour de taille (cm) | Number | Non | Indicateur sante metabolique, suivi progression |
| % masse grasse estime | Slider/Select | Non | Precision TDEE, objectif realiste |

**Impact sur l'app:**
- IMC = poids / (taille/100)^2 → classification (sous-poids, normal, surpoids, obese)
- TDEE = calcul calories quotidiennes necessaires
- Charges d'exercice = % du poids de corps pour debutants
- Tour de taille > 94cm (H) / > 80cm (F) → alerte risque metabolique

---

### Etape 3: Objectif principal
| Option | Description | Impact |
|--------|-------------|--------|
| Perdre du gras | Seche, perte de poids | Deficit calorique -300 a -500 kcal |
| Prendre de la masse | Prise de muscle | Surplus +200 a +400 kcal |
| Gagner en force | Powerlifting, performance | Focus charges lourdes, repos long |
| Ameliorer l'endurance | Cardio, stamina | Circuits, HIIT, repos court |
| Recomposition corporelle | Perdre gras + gagner muscle | Calories maintenance, high protein |
| Maintien | Rester en forme | Calories maintenance |
| Sante generale | Mobilite, bien-etre | Mix equilibre |

**Impact sur l'app:**
- **Seances**: type d'exercices, sets/reps, repos, volume
- **Nutrition**: calories cibles, distribution macros (P/G/L)
- **Coach IA**: conseils adaptes a l'objectif
- **Progression**: KPIs differents (poids vs force vs endurance)

---

### Etape 4: Niveau de pratique
| Niveau | Critere | Impact |
|--------|---------|--------|
| Debutant | 0-6 mois, < 2x/semaine | Exercices simples, technique d'abord, progression lente |
| Intermediaire | 6-24 mois, 2-4x/semaine | Exercices composes + isolation, periodisation |
| Avance | 2-5 ans, 4-6x/semaine | Split avance, techniques intensification |
| Expert | 5+ ans, competition | Programmation avancee, deload, peaking |

**Impact sur l'app:**
- Debutant: pas de souleve de terre lourd, pas de drop sets
- Complexite des exercices proposees
- Volume d'entrainement (nombre de sets/semaine)
- Conseils de forme plus detailles pour debutants

---

### Etape 5: Frequence et disponibilite
| Donnee | Type | Options |
|--------|------|---------|
| Jours d'entrainement/semaine | Select | 2, 3, 4, 5, 6 |
| Duree par seance (min) | Select | 30, 45, 60, 75, 90 |
| Jours preferes | Multi-select | Lun, Mar, Mer, Jeu, Ven, Sam, Dim |
| Heure preferee | Select | Matin (6-9), Midi (11-14), Soir (17-21) |

**Impact sur l'app:**
- 2-3x/semaine → Full Body
- 4x/semaine → Upper/Lower split
- 5-6x/semaine → Push/Pull/Legs ou bro split
- Duree courte → supersets, circuits
- Heure → notifications push personnalisees
- Jours → planning hebdomadaire genere

---

### Etape 6: Equipement disponible
| Option | Equipement | Impact |
|--------|-----------|--------|
| Salle complete | Barres, machines, cables, halteres | Tous les exercices disponibles |
| Salle basique | Halteres, banc, barre | Exercices composes principaux |
| Maison equipee | Halteres, elastiques, barre traction | Home workout adapte |
| Maison basique | Tapis, chaise | Poids du corps + materiel minimal |
| Poids du corps uniquement | Rien | Calisthenics, bodyweight |
| Exterieur | Parc, barre traction exterieure | Street workout |

**Impact sur l'app:**
- Filtre automatique des exercices selon equipement
- Substitutions intelligentes (pas de barre → halteres → poids du corps)
- Videos adaptees au contexte

---

### Etape 7: Sante et conditions medicales
| Donnee | Type | Pourquoi |
|--------|------|----------|
| Blessures actuelles | Multi-select + texte | Eviter exercices dangereux |
| Blessures passees | Multi-select | Attention renforce zones sensibles |
| Conditions medicales | Multi-select | Adapter intensite et nutrition |
| Medicaments | Texte libre (optionnel) | Interactions potentielles |
| Allergies alimentaires | Multi-select | Filtrer recettes et plans repas |

**Options blessures/zones:**
- Dos (lombaire, cervical)
- Epaules (coiffe rotateurs)
- Genoux
- Poignets
- Chevilles
- Hanches
- Coudes

**Options conditions medicales:**
- Diabete (type 1, type 2)
- Hypertension
- Cholesterol
- Problemes thyroidiens
- Asthme
- Problemes cardiaques
- Obesite diagnostiquee
- Stress/Anxiete/Depression
- Troubles du sommeil
- Aucune

**Options allergies:**
- Gluten
- Lactose
- Fruits de mer
- Arachides
- Oeufs
- Soja
- Aucune

**Impact sur l'app:**
- Blessure dos → exclusion deadlift lourd, exercises impactant la colonne
- Diabete → plan nutritionnel bas IG, monitoring glucides
- Allergies → recettes filtrees automatiquement
- Stress → suggestions yoga/meditation, exercices anti-stress
- Hypertension → pas de Valsalva, pas de charges maximales
- Coach IA: rappel "consulte ton medecin" pour questions sensibles

---

### Etape 8: Habitudes alimentaires
| Donnee | Type | Pourquoi |
|--------|------|----------|
| Regime alimentaire | Select | Filtrer recettes |
| Nombre de repas/jour | Select (3,4,5,6) | Repartition macros |
| Budget alimentaire | Select | Adapter recettes |
| Cuisine preferee | Multi-select | Prioriser recettes |
| Intolerance au Ramadan? | Bool | Mode Ramadan |

**Options regime:**
- Omnivore (tout)
- Halal (par defaut pour notre marche)
- Vegetarien
- Vegan
- Pescatarian (poisson uniquement)
- Keto
- Sans gluten
- Paleo

**Options cuisine:**
- Marocaine
- Mediterraneenne
- Indienne
- Asiatique
- Mexicaine
- Internationale

**Impact sur l'app:**
- Recettes filtrees par regime + allergies + cuisine preferee
- Plan repas genere avec les bonnes contraintes
- Budget faible → recettes economiques priorisees
- 3 repas → distribution 30/40/30 calories
- 5 repas → distribution 20/30/20/15/15 calories
- Ramadan → plans iftar/suhoor adaptes

---

### Etape 9: Mode de vie et activite quotidienne
| Donnee | Type | Pourquoi |
|--------|------|----------|
| Activite quotidienne | Select | Multiplicateur TDEE |
| Type de travail | Select | Adapter calories journalieres |
| Qualite de sommeil | Select | Score recuperation |
| Heures de sommeil | Number | Impact recuperation |
| Niveau de stress | Slider (1-10) | Adapter volume entrainement |
| Consommation d'eau | Select | Recommendations hydratation |

**Options activite:**
- Sedentaire (bureau, peu de mouvement) → TDEE x 1.2
- Legerement actif (marche, taches legeres) → TDEE x 1.375
- Moderement actif (exercice modere) → TDEE x 1.55
- Tres actif (travail physique) → TDEE x 1.725
- Extremement actif (athlete, travail tres physique) → TDEE x 1.9

**Impact sur l'app:**
- TDEE precis → calories cibles exactes
- Mauvais sommeil → reduction volume 10-15%, recuperation priorisee
- Stress eleve → exercices anti-stress, pas de surcharge, yoga suggere
- Sedentaire → plus de rappels mouvement, NEAT (marche)

---

### Etape 10: Objectifs chiffres (optionnel)
| Donnee | Type | Pourquoi |
|--------|------|----------|
| Poids cible (kg) | Number | Timeline et deficit calcules |
| Deadline souhaitee | Date | Rythme de progression |
| Objectif force (ex: squat 100kg) | Text | Suivi PR |
| Tour de taille cible | Number | Suivi mensuel |

**Impact sur l'app:**
- Poids cible + deadline → deficit/surplus quotidien calcule
- Ex: perdre 10kg en 6 mois = -550 kcal/jour
- Alerte si objectif irrealiste (> 1kg/semaine perte)
- Motivation: "Il te reste 4.5kg pour ton objectif!"

---

### Etape 11: Preferences app
| Donnee | Type | Pourquoi |
|--------|------|----------|
| Langue preferee | Select (FR, Darija, AR, EN) | Interface localisee |
| Notifications | Bool | Rappels |
| Heure rappel entrainement | Time | Notification push |
| Heure rappel repas | Time | Notification push |
| Unite de mesure | Select (kg/lbs, cm/in) | Affichage |

---

### Etape 12: Motivation et engagement
| Donnee | Type | Pourquoi |
|--------|------|----------|
| Pourquoi tu veux changer? | Multi-select | Personnalisation messages motivation |
| Qu'est-ce qui t'a empeche avant? | Multi-select | Adresser les blocages |
| Coach tone preference | Select | Style de coaching IA |

**Options motivation:**
- Sante
- Apparence physique
- Performance sportive
- Confiance en soi
- Energie au quotidien
- Exemple pour ma famille

**Options blocages:**
- Manque de temps
- Manque de motivation
- Ne sait pas quoi faire
- Blessure
- Cout de la salle
- Regime trop complique

**Options tone coach:**
- Motivant et energique ("Yallah! Tu peux le faire!")
- Calme et technique ("Focus sur la forme, pas la charge")
- Strict et exigeant ("Pas d'excuses aujourd'hui")
- Amical et supportif ("On y va doucement, tu geres")

**Impact sur l'app:**
- Messages IA personnalises selon le tone choisi
- Adresse les blocages specifiques dans les notifications
- Ex: "manque de temps" → seances courtes 30min priorisees
- Ex: "ne sait pas quoi faire" → guidance plus detaillee

---

## 3. COMMENT CES DONNEES IMPACTENT L'APP

### 3.1 Generation de Seances IA

```
DONNEES UTILISEES:
- Objectif → type de programme (force/masse/seche)
- Niveau → complexite exercices
- Frequence → split (full body/upper-lower/PPL)
- Equipement → filtre exercices disponibles
- Blessures → exclusion exercices dangereux
- Duree → nombre d'exercices, supersets si court
- Age → intensite, recuperation
- Poids → charges suggerees (% 1RM estime)

RESULTAT:
→ Seance 100% personnalisee avec exercices, sets, reps, poids, repos
```

### 3.2 Plan Nutritionnel

```
DONNEES UTILISEES:
- Poids + Taille + Age + Genre → BMR (metabolisme de base)
- Activite quotidienne → TDEE (calories totales)
- Objectif → deficit/surplus (seche: -500, masse: +300)
- Regime + Allergies → filtrage recettes
- Nombre repas → distribution calories
- Budget → recettes adaptees
- Conditions medicales → contraintes (diabete → bas IG)
- Cuisine preferee → recettes priorisees

RESULTAT:
→ Plan repas hebdomadaire avec macros, recettes, liste courses
```

### 3.3 Coach IA Personnalise

```
DONNEES UTILISEES:
- Tone preference → style de reponse
- Langue → Darija/FR/AR/EN
- Motivation → messages cibles
- Blocages → solutions proactives
- Historique seances → felicitations, corrections
- Niveau stress/sommeil → adaptation conseils

RESULTAT:
→ Coach qui connait l'utilisateur et adapte chaque reponse
```

### 3.4 Suivi de Progression

```
DONNEES UTILISEES:
- Poids initial + cible → courbe progression
- Mensurations → evolution corporelle
- Objectif force → suivi PR
- Conditions medicales → alertes sante

RESULTAT:
→ Dashboard personnalise avec KPIs pertinents
```

### 3.5 Notifications Intelligentes

```
DONNEES UTILISEES:
- Heure preferee → timing notifications
- Jours entrainement → rappels jours specifiques
- Motivation → messages adaptes
- Blocages → anticipation ("On sait que t'as pas bcp de temps, voici une seance de 20min!")

RESULTAT:
→ Notifications personnalisees et pertinentes
```

---

## 4. UX DE L'ONBOARDING (Animation et Flow)

### Philosophie UX (inspiree de Freeletics, Noom, Fitbod)
> L'utilisateur ne remplit PAS un formulaire.
> Il construit SON programme personnalise, etape par etape.
> Chaque ecran est une experience, pas une question.

### Design Principles
- **Immersif**: chaque ecran = 1 question, full screen, pas de distraction
- **Anime**: transitions (slide left/right), elements qui apparaissent (fade in/scale)
- **Gamifie**: progress bar, micro-celebrations, feedback immediat
- **Emotionnel**: illustrations, couleurs, phrases motivantes entre etapes
- **Rapide**: max 30 secondes par ecran, total < 5 minutes
- **Valorisant**: expliquer POURQUOI chaque donnee est utile

### Animations Requises
1. **Transition entre etapes**: Slide horizontal (comme un carousel)
2. **Selection d'option**: Scale bounce + couleur change (0.95 → 1.05 → 1.0)
3. **Progress bar**: Animation fluide de remplissage
4. **Illustrations**: Personnage/icone qui reagit au choix (ex: biceps qui grossit quand on choisit "masse")
5. **Micro-celebration**: Confetti ou sparkle apres chaque etape completee
6. **Ecran calcul final**: Compteur anime (calories, macros qui defilent avant de s'arreter)
7. **Phrases motivantes entre etapes**:
   - Apres etape 3: "Ton objectif est clair, on va t'y amener!"
   - Apres etape 6: "On connait ton setup, on adapte tout pour toi"
   - Apres etape 9: "Presque fini! Ton programme se construit..."
   - Apres etape 12: "C'est parti! Ton coach est pret!"

### Elements visuels par etape
| Etape | Visuel | Animation |
|-------|--------|-----------|
| 1. Identite | Avatar silhouette | Avatar qui prend forme |
| 2. Mensurations | Corps avec fleches | Fleches qui s'ajustent |
| 3. Objectif | Cartes avec illustrations | Carte selectionnee qui s'agrandit |
| 4. Niveau | Barre de progression | Barre qui se remplit |
| 5. Frequence | Calendrier interactif | Jours qui s'allument |
| 6. Equipement | Photos materiel | Photo selectionnee qui brille |
| 7. Sante | Corps avec zones | Zones qui s'allument au tap |
| 8. Alimentation | Assiette composee | Aliments qui apparaissent dans l'assiette |
| 9. Mode de vie | Personnage dans contexte | Personnage qui bouge selon activite |
| 10. Objectifs | Graphique trajectoire | Courbe qui se dessine |
| 11. Preferences | Toggles animes | Switches avec bounce |
| 12. Motivation | Emojis/coeurs | Pulse animation |
| Resume | Dashboard complet | Compteurs qui defilent |

### Flow Propose (12 etapes)

```
[Splash Bienvenue] → animation Big Boss logo
    ↓
[Etape 1] Identite → prenom, age, genre
    ↓ (animation transition)
[Etape 2] Mensurations → poids, taille (animation corps)
    ↓
[Etape 3] Objectif → cards animees avec illustrations
    ↓
[Etape 4] Niveau → slider anime avec description
    ↓
[Etape 5] Frequence → calendrier interactif
    ↓
[Etape 6] Equipement → images du materiel
    ↓
[Etape 7] Sante → checklist avec icones
    ↓
[Etape 8] Alimentation → preferences visuelles
    ↓
[Etape 9] Mode de vie → slider activite avec personnage anime
    ↓
[Etape 10] Objectifs chiffres → calculateur visuel
    ↓
[Etape 11] Preferences → toggles simples
    ↓
[Etape 12] Motivation → selection emotionnelle
    ↓
[Creation Profil] → animation "calcul en cours..."
    → Affichage resume: TDEE, macros, programme recommande
    ↓
[Dashboard] → premiere seance suggeree
```

### Progress Bar
```
[████████████░░░░░░░░] 60% - Etape 7/12
```

### Temps Estime
- Etapes 1-6: 2-3 minutes (obligatoires)
- Etapes 7-12: 2-3 minutes (optionnelles mais recommandees)
- Total: 4-6 minutes

---

## 5. STOCKAGE DES DONNEES

### Champs a ajouter a l'entite User

```
// Identite (existant)
Name, Email, BirthDate, Gender, WeightKg, HeightCm

// Nouveau - Mensurations
WaistCm, BodyFatPercent

// Nouveau - Objectifs
PrimaryGoal, SecondaryGoal, TargetWeightKg, TargetDate, TargetWaistCm

// Nouveau - Entrainement
Level, TrainingFrequency, PreferredDuration, PreferredDays (JSON), PreferredTime
AvailableEquipment (flags)

// Nouveau - Sante
Injuries (JSON array), PastInjuries (JSON array)
MedicalConditions (JSON array), Medications (text)
FoodAllergies (JSON array)

// Nouveau - Alimentation
DietType, MealsPerDay, FoodBudget, PreferredCuisines (JSON array)
IsRamadanMode

// Nouveau - Mode de vie
ActivityLevel, WorkType, SleepHours, SleepQuality, StressLevel
WaterIntake

// Nouveau - Preferences
PreferredLanguage (existant), NotificationsEnabled (existant)
WorkoutReminderTime, MealReminderTime, MeasurementUnit

// Nouveau - Motivation
MotivationReasons (JSON array), PreviousBlockers (JSON array)
CoachTonePreference

// Calcule
Bmr, Tdee, DailyCalorieTarget, DailyProteinTarget, DailyCarbTarget, DailyFatTarget
RecommendedSplit, OnboardingCompleted, OnboardingCompletedAt
```

---

## 6. CALCULS AUTOMATIQUES APRES ONBOARDING

### 6.1 BMR (Metabolisme de base)
```
Homme: BMR = 88.362 + (13.397 × poids kg) + (4.799 × taille cm) - (5.677 × age)
Femme: BMR = 447.593 + (9.247 × poids kg) + (3.098 × taille cm) - (4.330 × age)
```

### 6.2 TDEE (Depense energetique totale)
```
TDEE = BMR × facteur activite
Sedentaire: 1.2 | Leger: 1.375 | Modere: 1.55 | Actif: 1.725 | Extreme: 1.9
```

### 6.3 Calories cibles
```
Seche: TDEE - 500
Masse: TDEE + 300
Maintenance: TDEE
Recomposition: TDEE - 100
```

### 6.4 Distribution macros
```
Seche:     Proteines 2.2g/kg | Lipides 0.8g/kg | Glucides = reste
Masse:     Proteines 1.8g/kg | Lipides 1g/kg   | Glucides = reste
Force:     Proteines 2g/kg   | Lipides 0.9g/kg | Glucides = reste
Endurance: Proteines 1.6g/kg | Lipides 0.8g/kg | Glucides = reste
```

### 6.5 Programme recommande
```
2x/semaine → Full Body A/B
3x/semaine → Full Body A/B/C ou Push/Pull/Legs
4x/semaine → Upper/Lower x2
5x/semaine → Push/Pull/Legs/Upper/Lower
6x/semaine → Push/Pull/Legs x2
```

---

## 7. ECRAN RESUME POST-ONBOARDING

Apres les 12 etapes, afficher un ecran anime "Ton Profil Big Boss":

```
╔══════════════════════════════════════╗
║         TON PROFIL BIG BOSS         ║
╠══════════════════════════════════════╣
║                                      ║
║  👤 Ahmed, 28 ans                    ║
║  📏 178 cm | 82 kg | IMC: 25.9      ║
║                                      ║
║  🎯 Objectif: Prise de masse        ║
║  📊 Niveau: Intermediaire            ║
║  🏋️ 4x/semaine | 60min              ║
║                                      ║
║  ── CALCULS PERSONNALISES ──         ║
║                                      ║
║  🔥 TDEE: 2,650 kcal/jour           ║
║  🍗 Proteines: 148g (2g/kg)         ║
║  🍚 Glucides: 330g                  ║
║  🥑 Lipides: 74g                    ║
║  📈 Calories cible: 2,950 kcal      ║
║     (surplus +300)                   ║
║                                      ║
║  💪 Programme: Upper/Lower x2        ║
║  📅 Prochaine seance: Demain 18h    ║
║                                      ║
║  [COMMENCER MON PROGRAMME]           ║
║                                      ║
╚══════════════════════════════════════╝
```

---

## 8. PLAN D'IMPLEMENTATION

### Phase 1: Backend (2-3 jours)
1. Ajouter champs User entity
2. Migration DB
3. Endpoint PUT /api/users/onboarding
4. Calcul automatique BMR/TDEE/macros
5. Endpoint GET /api/users/me/recommendations

### Phase 2: Frontend - Onboarding Screens (3-4 jours)
1. 12 ecrans avec animations
2. Progress bar globale
3. Validation a chaque etape
4. Navigation avant/arriere
5. Ecran resume post-onboarding

### Phase 3: Integration IA (2 jours)
1. Injecter profil complet dans context Claude/OpenAI
2. Generation premiere seance personnalisee
3. Generation premier plan repas
4. Message de bienvenue personnalise du coach

### Phase 4: Test et Polish (1-2 jours)
1. Test flux complet inscription → onboarding → seance
2. Animations et transitions
3. Gestion des cas edge (donnees manquantes)
4. Performance (pas de lag entre etapes)

### Temps total estime: 8-11 jours

---

## 9. PRIORITE DES DONNEES

### Critiques (bloquent l'experience)
- Genre, Age, Poids, Taille
- Objectif principal
- Niveau de pratique
- Frequence et duree
- Equipement disponible

### Importantes (ameliorent significativement)
- Blessures et conditions medicales
- Allergies alimentaires
- Regime alimentaire
- Activite quotidienne

### Optionnelles (bonus)
- Objectifs chiffres
- Preferences de cuisine
- Tone du coach
- Motivation et blocages
- Budget alimentaire

---

## 10. CONCLUSION

Cet onboarding transforme Big Boss Fitness d'une app generique en un **coach personnel sur mesure**. Chaque donnee collectee a un impact concret sur:

1. **Les seances** → exercices, charges, volume adaptes
2. **La nutrition** → calories, macros, recettes filtrees
3. **Le coaching IA** → reponses personnalisees et pertinentes
4. **La progression** → KPIs et objectifs realistes
5. **Les notifications** → timing et contenu adaptes
6. **La retention** → utilisateur se sent compris et accompagne

**ROI de l'onboarding:**
- +40% retention J30 (source: industrie fitness apps)
- +60% engagement si profil complet
- +25% conversion Free → Premium (experience personnalisee)
