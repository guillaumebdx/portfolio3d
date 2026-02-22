# Portfolio 3D — Guillaume HARARI

Un portfolio interactif sous forme de musée 3D. Le visiteur se déplace dans un couloir de galerie et découvre les projets présentés comme des tableaux encadrés.

## Démo

> Le visiteur commence devant la porte du musée et avance pour découvrir les tableaux. Chaque projet possède une pancarte avec son titre et son année. Un indicateur lumineux passe du rouge au vert lorsque le visiteur regarde un tableau de près. Une surprise attend ceux qui les découvrent tous.

## Stack technique

- **React 19** + **TypeScript**
- **Three.js** via [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Drei](https://github.com/pmndrs/drei)
- **Post-processing** : Vignette, ACES Filmic ToneMapping
- **Vite** pour le bundling
- **GLB** (Draco-compressed) pour le modèle 3D du musée

## Fonctionnalités

- **Navigation FPS** : pointer lock + ZQSD/WASD (desktop), touch look + boutons avancer/reculer (mobile)
- **Collision** : raycasting multi-hauteur avec wall sliding
- **Éclairage cinématique** : ambient, ceiling track lights, spotlights dynamiques par tableau
- **Cadres 3D** : double bordure brun/or générée procéduralement autour de chaque peinture
- **Pancartes** : titre + année sous chaque tableau, avec indicateur de visite (rouge → vert)
- **Détection de regard** : dot product caméra/normale du tableau — il faut regarder le tableau, pas juste passer devant
- **Textures dynamiques** : images chargées depuis `src/assets/paints/` et mappées via `src/data/paintings.json`
- **Loader** : écran de chargement avec progression réelle + simulation fluide
- **Easter egg** : modale de félicitations avec embed YouTube quand tous les tableaux sont découverts

## Installation

```bash
npm install
npm run dev
```

## Ajouter / modifier un projet

1. Placer l'image dans `src/assets/paints/`
2. Éditer `src/data/paintings.json` :

```json
[
  { "file": "mon-projet.png", "title": "Mon Projet", "year": "2024" },
  ...
]
```

Les peintures sont assignées dans l'ordre de détection des meshes du GLB.

### Tailles d'images recommandées

| Format | Dimensions 3D | Pixels recommandés |
|--------|---------------|--------------------|
| Carrée | 1.44 × 1.44 | 1024 × 1024 px |
| Portrait | 0.79 × 2.88 | 512 × 1872 px |
| Paysage | 2.62 × 1.44 | 1920 × 1056 px |

## Build

```bash
npm run build
```

Les fichiers de production sont générés dans `dist/`.

## Structure

```
src/
├── assets/paints/       # Images des projets
├── components/
│   ├── CameraController # Navigation FPS + collisions
│   ├── CompletionModal  # Modale easter egg
│   ├── Lights           # Éclairage global
│   ├── Loader           # Écran de chargement
│   ├── Museum           # Scène principale (peintures, cadres, pancartes, spots)
│   ├── Overlay          # UI 2D (titre, boutons mobile)
│   └── Scene            # Canvas R3F + post-processing
├── data/
│   └── paintings.json   # Données des projets
└── App.tsx
```

## Licence

MIT
