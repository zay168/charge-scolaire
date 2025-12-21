# 📚 Charge Scolaire

> **Une couche d'intelligence au-dessus d'École Directe pour éviter la surcharge scolaire**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite)](https://vite.dev/)
[![Bun](https://img.shields.io/badge/Bun-Runtime-F9F1E1?style=flat&logo=bun)](https://bun.sh/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 Table des matières

1. [Vision du projet](#-vision-du-projet)
2. [Le problème](#-le-problème-en-détail)
3. [La solution](#-la-solution--charge-scolaire)
4. [Fonctionnalités](#-fonctionnalités-détaillées)
5. [Système de calcul](#-système-de-calcul-de-charge)
6. [Architecture technique](#️-architecture-technique)
7. [Installation](#-installation--développement)
8. [Guide d'utilisation](#-guide-dutilisation)
9. [API École Directe](#-intégration-école-directe)
10. [Structure du projet](#-structure-du-projet)
11. [Design System](#-design-system)
12. [Sécurité & RGPD](#-sécurité--rgpd)
13. [Roadmap](#-roadmap)
14. [Contribuer](#-contribuer)
15. [FAQ](#-faq)
16. [License](#-license)

---

## 🎯 Vision du projet

### Contexte

Dans le système éducatif français, un problème systémique persiste : **les professeurs travaillent en silo**. Chaque enseignant planifie ses devoirs et contrôles sans visibilité sur la charge de travail globale que les élèves accumulent de toutes les matières.

### Le constat

- Un professeur de mathématiques donne un DM pour vendredi
- Le professeur de français demande une rédaction pour le même jour
- Le professeur d'histoire programme un contrôle
- **Résultat :** L'élève se retrouve submergé sans que personne ne le réalise

### Notre mission

**Charge Scolaire** apporte une couche d'intelligence qui :
- **Agrège** les données de toutes les matières
- **Analyse** la charge cumulée en temps réel
- **Alerte** avant qu'une surcharge ne se produise
- **Suggère** des alternatives si nécessaire

> 💡 **Principe fondateur :** Le professeur reste décisionnaire. L'application aide à décider, elle ne décide pas à sa place.

---

## ❌ Le problème en détail

### 1️⃣ Les DST du samedi matin

Les Devoirs Surveillés (DST) du samedi matin sont un pilier du système français, notamment dans les filières générales. Ils préparent aux conditions d'examen (baccalauréat, concours).

#### Configuration typique

| Aspect | Description |
|--------|-------------|
| **Quand** | Samedi matin, généralement de 8h à 12h |
| **Durée** | Variable : 1h (interrogation rapide) à 4h (bac blanc) |
| **Qui** | Une ou plusieurs classes, parfois mélangées |
| **Organisation** | Planification au niveau de l'établissement |
| **Salles** | Amphithéâtres, gymnases, salles de réunion |

#### Les problèmes identifiés

```
Semaine 1 : DST Mathématiques (3h) — Terminale S
Semaine 2 : DST Philosophie (4h) — Toutes terminales
Semaine 3 : DST Physique-Chimie (3h) — Terminale S
Semaine 4 : DST Histoire-Géographie (3h) — Terminale S
```

**Problème majeur :** 4 samedis consécutifs avec DST lourd = **épuisement garanti**

#### Impact sur les élèves

- **Fatigue accumulée** : Pas de week-end de repos
- **Révisions insuffisantes** : Impossible de tout préparer
- **Stress chronique** : Anticipation anxieuse permanente
- **Baisse de performance** : Résultats en dégradation progressive

#### Solution Charge Scolaire

```
┌─────────────────────────────────────────────────────────────┐
│  📅 CALENDRIER DST — Vue établissement                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Semaine 51  │ 🟢 Libre                                     │
│  Semaine 52  │ 🔴 DST Maths (TS1, TS2) — PROGRAMMÉ          │
│  Semaine 1   │ 🟠 Recommandé : pause                        │
│  Semaine 2   │ 🟢 Disponible                                │
│                                                             │
│  ⚠️ ALERTE : Programmation d'un DST semaine 1              │
│     → 2 samedis consécutifs détectés                       │
│     → Recommandation : reporter en semaine 2               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Règles implémentées :**
- ✅ Maximum 1 DST lourd par tranche de 2 semaines
- ✅ Détection automatique de 2+ samedis consécutifs
- ✅ Blocage visuel des dates problématiques
- ✅ Suggestions de dates alternatives

---

### 2️⃣ Les devoirs en semaine

#### Le problème du silo

Chaque professeur utilise École Directe pour :
- Consulter le cahier de textes de **sa matière**
- Ajouter des devoirs pour **ses classes**
- Voir les contrôles qu'**il a programmés**

**Ce qu'il ne voit JAMAIS :**
- Les devoirs des autres matières
- La charge totale de l'élève
- Les contrôles déjà prévus ce jour-là

#### Scénario réel typique

```
📅 LUNDI 15 JANVIER — Terminale S1 — Vue élève

┌─────────────────────────────────────────────────────────────┐
│  08:00-09:00  │ Mathématiques                               │
│               │ → Rendre DM sur les intégrales (2h travail) │
├─────────────────────────────────────────────────────────────┤
│  09:00-10:00  │ Français                                    │
│               │ → Commentaire composé à rendre (~3h)        │
├─────────────────────────────────────────────────────────────┤
│  10:15-11:15  │ Philosophie                                 │
│               │ → Contrôle sur Descartes                    │
├─────────────────────────────────────────────────────────────┤
│  11:15-12:15  │ Histoire-Géographie                         │
│               │ → Fiche de révision à rendre                │
├─────────────────────────────────────────────────────────────┤
│  CHARGE TOTALE DU JOUR                                      │
│                                                             │
│  Score : 11/10 — ❌ SURCHARGE CRITIQUE                      │
│                                                             │
│  Temps de travail estimé la veille : 6-8 heures             │
└─────────────────────────────────────────────────────────────┘
```

**Pourquoi ça arrive ?**
- Le prof de maths n'a pas vu le DM de français
- Le prof de français n'a pas vu le contrôle de philo
- Personne n'a la vue d'ensemble

#### Solution Charge Scolaire

```
┌─────────────────────────────────────────────────────────────┐
│  👨‍🏫 AJOUT D'UN DEVOIR — Interface professeur              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Classe : Terminale S1                                      │
│  Matière : Mathématiques                                    │
│  Date souhaitée : 15 janvier                                │
│  Type : DM (poids: 2)                                       │
│                                                             │
├────────────────────────────────────────────────────────────┤
│  ⚠️ ALERTE SURCHARGE DÉTECTÉE                              │
│                                                             │
│  Cette classe a déjà une charge élevée pour le 15 janvier :│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📘 Français — Commentaire composé ............ +2   │   │
│  │ 📗 Philosophie — Contrôle .................... +3   │   │
│  │ 📙 Histoire-Géo — Fiche de révision .......... +1   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Score actuel du jour : 6 (🟠 Modéré)               │   │
│  │ Si vous ajoutez votre devoir : 8 (🔴 Chargé)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📊 SUGGESTION                                              │
│  Le 17 janvier a un score de 2 (🟢 Léger)                  │
│                                                             │
│  [❌ Annuler]  [📅 Voir autre date]  [✅ Confirmer quand même] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ La solution : Charge Scolaire

### Philosophie

```
╔════════════════════════════════════════════════════════════════╗
║                     PRINCIPES FONDATEURS                       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║   🔔 ALERTER, pas punir                                        ║
║      → L'application informe, le prof décide                  ║
║                                                                ║
║   📊 INFORMER, pas contraindre                                 ║
║      → Données factuelles, pas jugements de valeur            ║
║                                                                ║
║   🤝 AIDER, pas remplacer                                      ║
║      → Outil d'aide à la décision, pas décideur               ║
║                                                                ║
║   🔒 RESPECTER, pas surveiller                                 ║
║      → Données agrégées, pas tracking individuel              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### Ce que fait l'application

| Fonctionnalité | Pour les élèves | Pour les profs |
|----------------|-----------------|----------------|
| **Agrégation** | Voir tous les devoirs | Voir la charge de ses classes |
| **Visualisation** | Graphiques personnels | Tableaux de bord par classe |
| **Alertes** | Pic de charge à venir | Avant d'ajouter un devoir |
| **Historique** | Semaines passées | Tendances sur le trimestre |
| **Suggestions** | — | Dates alternatives |

### Ce que l'application ne fait PAS

- ❌ Bloquer l'ajout de devoirs
- ❌ Modifier École Directe
- ❌ Stocker les mots de passe
- ❌ Conserver des données personnelles permanentes
- ❌ Remplacer le jugement pédagogique

---

## 🚀 Fonctionnalités détaillées

### Pour les élèves 🎓

#### Tableau de bord personnel

```
┌─────────────────────────────────────────────────────────────┐
│  📊 TABLEAU DE BORD — Jean Dupont                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐│
│  │ 📅 AUJOURD│  │ 📊 SEMAINE│  │ 📝 DSTs   │  │ 📈 MOYENNE││
│  │    'HUI   │  │           │  │           │  │  15 JOURS ││
│  │           │  │           │  │           │  │           ││
│  │     3     │  │    12     │  │     2     │  │   4.2     ││
│  │  devoirs  │  │  travaux  │  │ à venir   │  │ pts/jour  ││
│  │           │  │           │  │           │  │           ││
│  │ [█████░░] │  │ [██████░] │  │ ⚠️ 1 alerte│  │ 🟢 Léger  ││
│  │   6 pts   │  │  18 pts   │  │           │  │           ││
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Prochains devoirs

Liste des travaux à venir avec :
- **Matière** et professeur
- **Date d'échéance** et date donnée
- **Type** (exercice, DM, contrôle, DST)
- **Poids** dans le calcul de charge
- **Statut** (fait / à faire)

#### Graphiques de charge

1. **Charge par jour** (15 jours)
   - Barres colorées selon le seuil
   - Mise en évidence du jour actuel
   - Identification des pics

2. **Évolution hebdomadaire** (9 semaines)
   - Courbe de tendance
   - Comparaison avec les semaines passées
   - Identification des patterns

3. **Répartition par matière**
   - Contribution de chaque matière
   - Identification des matières les plus exigeantes

---

### Pour les professeurs 👨‍🏫

#### Vue d'ensemble des classes

```
┌─────────────────────────────────────────────────────────────┐
│  👨‍🏫 MES CLASSES — M. Martin (Mathématiques)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Terminale S1                    ▸ 32 élèves      │   │
│  │    Charge actuelle : 🟠 Modérée (Score: 6)          │   │
│  │    DSTs cette semaine : 0                            │   │
│  │    Prochain DST : Samedi 21 déc. (Maths)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Première S3                     ▸ 30 élèves      │   │
│  │    Charge actuelle : 🟢 Légère (Score: 3)           │   │
│  │    DSTs cette semaine : 0                            │   │
│  │    Prochain DST : Aucun programmé                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Terminale ES2                   ▸ 28 élèves      │   │
│  │    Charge actuelle : 🔴 Élevée (Score: 9)           │   │
│  │    ⚠️ ALERTE : 3 contrôles prévus cette semaine     │   │
│  │    DSTs cette semaine : 1 (SES)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Système d'alertes

| Type d'alerte | Sévérité | Description |
|---------------|----------|-------------|
| Surcharge journalière | 🔴 Haute | Score > 10 un jour donné |
| Surcharge hebdomadaire | 🟠 Moyenne | Score > 35 sur la semaine |
| DSTs consécutifs | 🔴 Haute | 2+ samedis d'affilée avec DST |
| DSTs trop proches | 🟠 Moyenne | < 2 semaines entre 2 DST |
| Jour adjacent chargé | 🟡 Basse | Veille ou lendemain chargé |

#### Workflow d'ajout de devoir

```
┌──────────────────────────────────────────────────────────────┐
│  PROCESSUS D'AJOUT D'UN DEVOIR                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣ SÉLECTION                                                │
│     │                                                        │
│     ├─▸ Classe cible                                        │
│     ├─▸ Date souhaitée                                      │
│     ├─▸ Type de travail                                     │
│     └─▸ Description                                          │
│          │                                                   │
│          ▼                                                   │
│  2️⃣ ANALYSE AUTOMATIQUE                                      │
│     │                                                        │
│     ├─▸ Calcul du score projeté                             │
│     ├─▸ Vérification des seuils                             │
│     ├─▸ Détection des conflits                              │
│     └─▸ Recherche d'alternatives                            │
│          │                                                   │
│          ▼                                                   │
│  3️⃣ AFFICHAGE DU RÉSULTAT                                    │
│     │                                                        │
│     ├─▸ 🟢 OK : Ajout sans problème                         │
│     ├─▸ 🟠 ATTENTION : Charge modérée, confirmation requise │
│     └─▸ 🔴 ALERTE : Surcharge, alternatives proposées       │
│          │                                                   │
│          ▼                                                   │
│  4️⃣ DÉCISION DU PROFESSEUR                                   │
│     │                                                        │
│     ├─▸ Confirmer (avec avertissement noté)                 │
│     ├─▸ Choisir une date alternative                        │
│     └─▸ Annuler                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Système de calcul de charge

### Pondération des travaux

Le système attribue un **score** à chaque type de travail en fonction de l'effort requis :

#### Travaux à la maison

| Type | Poids | Exemple |
|------|-------|---------|
| `LIGHT` | 1 point | Petit exercice, relecture, vocabulaire |
| `MEDIUM` | 2 points | DM standard, rédaction courte, fiche de révision |
| `HEAVY` | 3 points | DM long, dissertation, projet, exposé |

#### Évaluations

| Type | Poids | Exemple |
|------|-------|---------|
| `QUIZ` | 2 points | Interrogation surprise, QCM rapide |
| `CONTROL` | 3 points | Contrôle classique (1h) |
| `DST` | 5 points | Devoir surveillé samedi (2-3h) |
| `EXAM` | 7 points | Bac blanc, examen de fin de trimestre |

### Algorithme d'estimation automatique

```javascript
// L'application analyse le contenu du devoir pour estimer sa charge

function estimateHomeworkWeight(content) {
  const text = content.toLowerCase();
  
  // Indicateurs de charge lourde
  if (text.includes('rédaction') || 
      text.includes('dissertation') ||
      text.includes('projet') ||
      text.includes('exposé')) {
    return 'HEAVY';
  }
  
  // Indicateurs de charge légère
  if (text.includes('relire') || 
      text.includes('réviser') ||
      text.includes('exercice') ||
      content.length < 50) {
    return 'LIGHT';
  }
  
  return 'MEDIUM';
}
```

### Seuils de charge

#### Charge journalière

| Score | Statut | Indicateur | Description |
|-------|--------|------------|-------------|
| 0-4 | Léger | 🟢 | Journée normale, équilibrée |
| 5-7 | Modéré | 🟠 | Charge notable mais gérable |
| 8-10 | Chargé | 🔴 | Journée difficile, attention requise |
| >10 | Critique | ❌ | Surcharge, intervention recommandée |

#### Charge hebdomadaire

| Score | Statut | Description |
|-------|--------|-------------|
| 0-15 | Semaine légère | Rythme soutenable |
| 16-25 | Semaine moyenne | Rythme standard |
| 26-35 | Semaine chargée | Effort soutenu requis |
| >35 | Semaine critique | Risque d'épuisement |

### Règles spécifiques aux DST

```javascript
const DST_RULES = {
  // Maximum 1 DST lourd par tranche de 2 semaines
  MAX_PER_BIWEEKLY: 1,
  
  // Au moins 2 semaines entre 2 DST de la même matière
  MIN_WEEKS_BETWEEN_SAME_SUBJECT: 2,
  
  // Pas plus de 2 samedis consécutifs avec DST
  MAX_CONSECUTIVE_SATURDAYS: 2,
  
  // Alerter si plus de 3 DST sur un mois
  MONTHLY_THRESHOLD: 3,
};
```

---

## ⚙️ Architecture technique

### Vue d'ensemble

```
┌────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE CHARGE SCOLAIRE                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐         ┌──────────────┐         ┌────────────┐ │
│  │              │         │              │         │            │ │
│  │    Élève     │────────▶│   Frontend   │◀───────▶│   École    │ │
│  │              │         │    React     │         │  Directe   │ │
│  └──────────────┘         │              │         │    API     │ │
│                           │  ┌────────┐  │         │            │ │
│  ┌──────────────┐         │  │ Auth   │  │         └────────────┘ │
│  │              │         │  │Context │  │                │       │
│  │  Professeur  │────────▶│  └────────┘  │                │       │
│  │              │         │              │                ▼       │
│  └──────────────┘         │  ┌────────┐  │         ┌────────────┐ │
│                           │  │Workload│  │◀───────▶│   Mock     │ │
│                           │  │Context │  │   DEV   │   Client   │ │
│                           │  └────────┘  │         └────────────┘ │
│                           │              │                        │
│                           │  ┌────────┐  │                        │
│                           │  │ Utils  │  │                        │
│                           │  │(Calcul)│  │                        │
│                           │  └────────┘  │                        │
│                           │              │                        │
│                           └──────────────┘                        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│                      FLUX DE DONNÉES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AUTHENTIFICATION                                            │
│     │                                                           │
│     ├─▸ [Élève] Identifiants École Directe                     │
│     │       └─▸ Token temporaire (jamais stocké)               │
│     │                                                           │
│     └─▸ [Prof] Compte établissement                            │
│             └─▸ Session locale                                  │
│                                                                 │
│  2. RÉCUPÉRATION DES DONNÉES                                    │
│     │                                                           │
│     ├─▸ GET /cahierdetexte → Devoirs (matière, date, contenu)  │
│     ├─▸ GET /emploidutemps → Emploi du temps                   │
│     └─▸ GET /notes → Notes (optionnel)                         │
│                                                                 │
│  3. TRAITEMENT                                                  │
│     │                                                           │
│     ├─▸ Normalisation des données                              │
│     ├─▸ Calcul des scores de charge                            │
│     ├─▸ Détection des alertes                                  │
│     └─▸ Génération des statistiques                            │
│                                                                 │
│  4. AFFICHAGE                                                   │
│     │                                                           │
│     ├─▸ Tableaux de bord                                       │
│     ├─▸ Graphiques Chart.js                                    │
│     ├─▸ Listes et cartes                                       │
│     └─▸ Alertes et notifications                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Stack technique détaillée

| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| **Runtime** | Bun | Latest | Performances, DX moderne |
| **Build** | Vite | 6.0 | HMR ultra-rapide, ESM natif |
| **Framework** | React | 19 | Écosystème mature, hooks |
| **Routing** | React Router | 7.x | Standard de l'industrie |
| **State** | Context API | — | Simplicité, pas d'overhead |
| **Graphiques** | Chart.js | 4.x | Léger, personnalisable |
| **Styling** | Vanilla CSS | — | Contrôle total, performance |

### Choix architecturaux

#### Pourquoi pas de backend ?

L'application est **100% frontend** pour plusieurs raisons :

1. **Confidentialité** : Les identifiants École Directe restent côté client
2. **Simplicité** : Pas de serveur à maintenir
3. **Performance** : Données en cache navigateur
4. **Déploiement** : Static hosting (Vercel, Netlify, GitHub Pages)

#### Pourquoi Context API plutôt que Redux ?

- **Simplicité** : Moins de boilerplate
- **Performance** : Suffisant pour notre use case
- **Maintenance** : Moins de fichiers, moins de complexité
- **React 19** : Optimisations natives du contexte

---

## 💻 Installation & Développement

### Prérequis

| Outil | Version minimum | Recommandé |
|-------|-----------------|------------|
| Node.js | 18.x | 20.x+ |
| Bun | 1.0 | Latest |
| Git | 2.x | Latest |

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/votre-repo/charge-scolaire.git
cd charge-scolaire

# 2. Installer les dépendances
bun install

# 3. Lancer le serveur de développement
bun dev

# 4. Ouvrir dans le navigateur
# → http://localhost:5173
```

### Scripts disponibles

```bash
# Développement
bun dev              # Serveur de dev avec HMR

# Build
bun run build        # Build de production
bun run preview      # Preview du build

# Qualité
bun run lint         # ESLint
bun run lint:fix     # ESLint avec auto-fix
```

### Variables d'environnement

Créer un fichier `.env.local` :

```env
# Mode développement (utilise les données mock)
VITE_USE_MOCK=true

# URL de l'API École Directe (prod)
VITE_ED_API_URL=https://api.ecoledirecte.com/v3
```

### Comptes de test

| Type | Identifiant | Mot de passe | Description |
|------|-------------|--------------|-------------|
| 🎓 Élève | *(n'importe quoi)* | *(n'importe quoi)* | Données mock Terminale S |
| 👨‍🏫 Prof | `demo@prof.fr` | `demo` | Vue multi-classes |

---

## 📱 Guide d'utilisation

### Connexion élève

1. **Accéder à l'application** → `http://localhost:5173`
2. **Sélectionner l'onglet "Élève"** (par défaut)
3. **Entrer vos identifiants** École Directe
4. **Cliquer sur "Se connecter"**

> 💡 En mode développement, n'importe quels identifiants fonctionnent.

### Navigation

| Élément | Description |
|---------|-------------|
| **Sidebar** | Navigation principale (Dashboard, Calendrier, Devoirs...) |
| **Header** | Informations utilisateur, déconnexion |
| **Dashboard** | Vue d'ensemble de la charge |

### Comprendre les indicateurs

| Icône | Signification |
|-------|---------------|
| 🟢 | Charge légère — tout va bien |
| 🟠 | Charge modérée — attention |
| 🔴 | Charge élevée — surcharge |
| ❌ | Charge critique — intervention requise |

### Interpréter les graphiques

#### Graphique journalier (barres)

- **Axe X** : Jours (7 jours passés → 7 jours futurs)
- **Axe Y** : Score de charge
- **Couleurs** : Vert (léger) → Orange (modéré) → Rouge (chargé)
- **Barre mise en évidence** : Aujourd'hui

#### Graphique hebdomadaire (courbe)

- **Axe X** : Semaines (4 passées → 4 futures)
- **Axe Y** : Score cumulé
- **Point mis en évidence** : Semaine actuelle
- **Zone sous la courbe** : Tendance visuelle

---

## 🔌 Intégration École Directe

### À propos de l'API

> ⚠️ **Disclaimer** : L'API École Directe n'est pas officiellement documentée. Ce projet utilise une documentation communautaire. Usage à vos risques.

### Endpoints utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/login.awp` | POST | Authentification |
| `/Eleves/{id}/cahierdetexte.awp` | POST | Devoirs et contrôles |
| `/E/{id}/emploidutemps.awp` | POST | Emploi du temps |
| `/Eleves/{id}/notes.awp` | POST | Notes (optionnel) |

### Format des requêtes

```javascript
// Toutes les requêtes utilisent ce format
const request = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Token': token, // Token obtenu à la connexion
  },
  body: `data=${encodeURIComponent(JSON.stringify(payload))}`,
};
```

### Gestion des erreurs

| Code | Signification | Action |
|------|---------------|--------|
| 200 | Succès | Continuer |
| 505 | Identifiants incorrects | Redemander connexion |
| 510 | Compte bloqué | Afficher message d'erreur |
| 520 | Maintenance | Afficher message d'attente |

### Client Mock (développement)

En mode développement, un client mock simule les réponses de l'API :

```javascript
// src/api/ecoleDirecte.js
const isDev = import.meta.env.DEV;
export default isDev ? mockEcoleDirecteClient : ecoleDirecteClient;
```

Données mock générées dynamiquement :
- 5-10 devoirs répartis sur 30 jours
- 2-3 DST sur le mois
- Dates relatives à aujourd'hui

---

## 📁 Structure du projet

```
charge-scolaire/
│
├── public/                     # Assets statiques
│   └── favicon.svg
│
├── src/
│   │
│   ├── api/                    # Clients API
│   │   └── ecoleDirecte.js     # Client réel + mock
│   │
│   ├── components/
│   │   │
│   │   ├── charts/             # Composants graphiques
│   │   │   ├── WorkloadChart.jsx
│   │   │   └── WorkloadChart.css
│   │   │
│   │   ├── layout/             # Structure de page
│   │   │   ├── AppLayout.jsx   # Layout principal
│   │   │   ├── AppLayout.css
│   │   │   ├── Sidebar.jsx     # Navigation latérale
│   │   │   └── Sidebar.css
│   │   │
│   │   └── ui/                 # Composants réutilisables
│   │       ├── AssignmentCard.jsx
│   │       ├── AssignmentCard.css
│   │       ├── LoadIndicator.jsx
│   │       └── LoadIndicator.css
│   │
│   ├── contexts/               # État global React
│   │   ├── AuthContext.jsx     # Authentification
│   │   └── WorkloadContext.jsx # Données de charge
│   │
│   ├── data/                   # Données mock
│   │   └── mockData.js         # Classes, devoirs, DSTs
│   │
│   ├── hooks/                  # Hooks personnalisés
│   │   └── (futurs hooks)
│   │
│   ├── pages/                  # Pages / routes
│   │   ├── LoginPage.jsx
│   │   ├── LoginPage.css
│   │   ├── DashboardPage.jsx
│   │   └── DashboardPage.css
│   │
│   ├── styles/                 # Styles globaux
│   │   └── design-system.css   # Tokens, variables, primitives
│   │
│   ├── utils/                  # Utilitaires
│   │   └── workloadCalculator.js  # Moteur de calcul
│   │
│   ├── App.jsx                 # Composant racine
│   ├── App.css                 # Styles de l'app
│   ├── main.jsx                # Point d'entrée
│   └── index.css               # Reset CSS
│
├── index.html                  # Template HTML
├── vite.config.js              # Configuration Vite
├── package.json                # Dépendances
├── bun.lockb                   # Lock file Bun
└── README.md                   # Ce fichier
```

### Détail des fichiers clés

#### `workloadCalculator.js`

Le **cerveau** de l'application. Contient :

- `WORKLOAD_WEIGHTS` — Pondération des types de travaux
- `WORKLOAD_THRESHOLDS` — Seuils journaliers et hebdomadaires
- `calculateDailyWorkload()` — Score d'un jour
- `calculateWeeklyWorkload()` — Score d'une semaine
- `analyzeDSTSchedule()` — Analyse des DST
- `checkForConflicts()` — Détection de surcharge
- `suggestDSTDates()` — Suggestions de dates

#### `AuthContext.jsx`

Gestion de l'authentification :

- Connexion élève (École Directe)
- Connexion professeur (démo)
- Gestion du token
- Persistance de session

#### `WorkloadContext.jsx`

État global des données :

- Liste des devoirs
- Liste des DST
- Classes (pour les profs)
- Calculs en mémoire
- Actions (ajout, suppression)

---

## 🎨 Design System

### Tokens CSS

Le fichier `design-system.css` définit tous les tokens :

#### Couleurs

```css
:root {
  /* Primaires */
  --color-primary-50: hsl(220, 100%, 97%);
  --color-primary-500: hsl(220, 80%, 50%);
  --color-primary-900: hsl(220, 80%, 15%);
  
  /* Sémantiques */
  --color-success: hsl(142, 70%, 45%);
  --color-warning: hsl(42, 90%, 50%);
  --color-error: hsl(4, 85%, 55%);
  --color-critical: hsl(350, 90%, 45%);
  
  /* Neutres */
  --color-neutral-50: hsl(220, 20%, 98%);
  --color-neutral-500: hsl(220, 10%, 50%);
  --color-neutral-900: hsl(220, 20%, 10%);
}
```

#### Typographie

```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

#### Espacements

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
}
```

#### Ombres

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
}
```

### Composants UI

#### Boutons

```html
<button class="btn btn--primary">Primaire</button>
<button class="btn btn--secondary">Secondaire</button>
<button class="btn btn--ghost">Ghost</button>
```

#### Cartes

```html
<div class="card">
  <div class="card__header">Titre</div>
  <div class="card__body">Contenu</div>
  <div class="card__footer">Actions</div>
</div>
```

#### Indicateurs de charge

```html
<div class="load-indicator load-indicator--light">🟢 Léger</div>
<div class="load-indicator load-indicator--medium">🟠 Modéré</div>
<div class="load-indicator load-indicator--heavy">🔴 Chargé</div>
<div class="load-indicator load-indicator--critical">❌ Critique</div>
```

---

## 🔒 Sécurité & RGPD

### Principes de sécurité

| Aspect | Implémentation |
|--------|----------------|
| **Mots de passe** | JAMAIS stockés, même temporairement |
| **Token API** | En mémoire uniquement, effacé à la fermeture |
| **Données élèves** | Agrégées, jamais individualisées |
| **Session** | Courte durée, réauthentification requise |

### Conformité RGPD

#### Données collectées

| Donnée | Finalité | Durée de conservation |
|--------|----------|----------------------|
| Devoirs | Calcul de charge | Session uniquement |
| Notes | Non collectées | — |
| Identité | Affichage prénom | Session uniquement |

#### Droits des utilisateurs

- ✅ **Droit d'accès** : L'élève voit ses propres données
- ✅ **Droit à l'effacement** : Déconnexion = suppression totale
- ✅ **Droit à la portabilité** : N/A (pas de stockage)
- ✅ **Droit d'opposition** : Possibilité de ne pas utiliser l'app

### Avertissements

```
⚠️ AVERTISSEMENT LÉGAL

Ce projet est un PROTOTYPE ÉDUCATIF.

Pour un déploiement en production :
1. Obtenir l'accord de l'établissement
2. Valider la conformité RGPD avec un DPO
3. Effectuer une analyse d'impact (PIA)
4. Rédiger les mentions légales appropriées
5. Mettre en place le recueil de consentement

L'utilisation de l'API École Directe non-officielle 
peut être contraire aux CGU du service.
```

---

## 📋 Roadmap

### Phase 1 : Fondations ✅

| Fonctionnalité | Statut |
|----------------|--------|
| Structure projet | ✅ Terminé |
| Design system CSS | ✅ Terminé |
| Authentification mock | ✅ Terminé |
| Dashboard élève | ✅ Terminé |
| Graphiques Chart.js | ✅ Terminé |
| Moteur de calcul | ✅ Terminé |

### Phase 2 : Interface professeur 🔄

| Fonctionnalité | Statut |
|----------------|--------|
| Dashboard multi-classes | ✅ Terminé |
| Vue détaillée par classe | 🔲 À faire |
| Formulaire ajout devoir | 🔲 À faire |
| Système d'alertes | 🔲 À faire |
| Suggestions de dates | 🔲 À faire |

### Phase 3 : Calendrier DST 🔲

| Fonctionnalité | Statut |
|----------------|--------|
| Calendrier interactif | 🔲 À faire |
| Planification DST | 🔲 À faire |
| Détection conflits | 🔲 À faire |
| Export PDF/iCal | 🔲 À faire |

### Phase 4 : Améliorations 🔲

| Fonctionnalité | Statut |
|----------------|--------|
| Mode hors-ligne (PWA) | 🔲 À faire |
| Notifications push | 🔲 À faire |
| Intégration vraie API ED | 🔲 À faire |
| Application mobile | 🔲 À faire |

---

## 🤝 Contribuer

### Workflow de contribution

1. **Fork** le repository
2. **Clone** votre fork
3. **Créer une branche** : `git checkout -b feature/ma-feature`
4. **Développer** et tester
5. **Commit** : `git commit -m "feat: description"`
6. **Push** : `git push origin feature/ma-feature`
7. **Pull Request** vers `main`

### Conventions de code

#### Commits

Format : `type: description`

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage, pas de changement de code |
| `refactor` | Refactoring |
| `test` | Ajout ou modification de tests |
| `chore` | Maintenance, dépendances |

#### CSS

- Méthodologie **BEM** : `.block__element--modifier`
- Variables CSS pour toutes les valeurs
- Mobile-first

#### JavaScript/React

- **Functional components** uniquement
- **Hooks** pour la logique
- **PropTypes** ou TypeScript (si migration)
- **ESLint** pour le linting

---

## ❓ FAQ

### Questions techniques

**Q : Pourquoi Bun plutôt que npm/yarn ?**

R : Bun offre des performances supérieures (installation, exécution) et une DX moderne. Le projet reste compatible avec npm/yarn.

**Q : L'API École Directe est-elle légale à utiliser ?**

R : L'API n'est pas officiellement documentée. Pour un usage personnel/éducatif, c'est généralement toléré. Pour un déploiement public, une validation juridique est nécessaire.

**Q : Puis-je utiliser TypeScript ?**

R : Le projet est en JavaScript pour simplifier l'onboarding. Une migration TypeScript est envisageable en Phase 4.

### Questions fonctionnelles

**Q : Les professeurs peuvent-ils bloquer des dates ?**

R : Non. L'application **suggère** et **alerte**, mais le professeur reste décisionnaire. C'est un choix philosophique.

**Q : Comment sont calculés les scores ?**

R : Voir la section [Système de calcul](#-système-de-calcul-de-charge). En résumé : chaque type de travail a un poids, et les scores sont cumulés par jour/semaine.

**Q : Les données sont-elles partagées entre élèves ?**

R : Non. Chaque élève ne voit que ses propres données. Les professeurs voient des données agrégées par classe, jamais par élève.

### Questions de déploiement

**Q : Comment déployer en production ?**

R : 
```bash
bun run build
# Le dossier 'dist' contient les fichiers statiques
# Déployer sur Vercel, Netlify, ou tout hébergeur statique
```

**Q : Faut-il un serveur backend ?**

R : Non pour le prototype. Les appels API sont faits directement depuis le navigateur. Pour la production, un proxy backend pourrait être nécessaire pour sécuriser les tokens.

---

## 📝 License

```
MIT License

Copyright (c) 2024 Charge Scolaire

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Remerciements

- **Communauté École Directe** pour la documentation non-officielle de l'API
- **React Team** pour un framework toujours excellent
- **Chart.js** pour les visualisations performantes
- **Bun** pour révolutionner le développement JavaScript

---

<div align="center">

**📚 Charge Scolaire**

*Une couche d'intelligence pour un système éducatif plus humain*

[Signaler un bug](../../issues) · [Proposer une fonctionnalité](../../issues) · [Documentation](../../wiki)

</div>
