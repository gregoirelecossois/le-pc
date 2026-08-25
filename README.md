# Le PC — monte ton ordinateur

Jeu 3D pour apprendre à **nommer, situer, comprendre et manipuler** les
composants d'une unité centrale. Conçu pour des élèves de collège
(technologie, cycle 4), en préparation d'une séance de montage / démontage
sur une **vraie machine**.

Tout fonctionne dans le navigateur, sans installation côté élève, et **sans
aucune donnée envoyée sur Internet** : la progression reste dans le
navigateur du poste.

---

## Le parcours

| # | Chapitre | Ce que l'élève fait | Ce qu'il sait faire après |
|---|----------|---------------------|---------------------------|
| 1 | 🔍 La visite guidée | Écarte la vue éclatée, clique sur chaque pièce, lit sa fiche | Reconnaître visuellement les 13 composants |
| 2 | 🏷️ Comment ça s'appelle ? | La pièce tourne sur un présentoir, il choisit son nom | Associer une forme à un nom |
| 3 | 🎯 Trouve-le dans la tour | On donne un nom, il clique dessus dans la machine | Situer chaque composant |
| 4 | 🧠 À quoi ça sert ? | Relie chaque pièce à son rôle | Expliquer la fonction de chaque composant |
| 5 | 🔧 Le montage | Glisse chaque pièce à sa place, dans le bon ordre | Monter une unité centrale complète |
| 6 | 🔌 Le câblage | Relie les 7 câbles internes aux bons connecteurs | Reconnaître les câbles et leur destination |
| 7 | 🖥️ Les périphériques | Branche 9 périphériques à l'arrière, puis les classe | Reconnaître les prises, distinguer entrée / sortie |
| 8 | 🧰 Le démontage | Retire les pièces dans l'ordre inverse | Démonter sans rien casser |
| 9 | 🏆 Le défi du technicien | Montage complet chronométré, sans indice | Maîtriser l'ensemble |

Chaque chapitre donne des **XP**, jusqu'à **3 étoiles** (selon les erreurs et
les indices utilisés) et débloque le suivant. **12 badges** et 6 niveaux
(de « Curieux·se » à « Expert·e matériel ») jalonnent le parcours.

### La fiche de révision

Depuis le parcours, le bouton **« Fiche de révision »** ouvre un document
**imprimable** : tableau des composants, ordre de montage et de démontage,
câbles, périphériques, gestes de sécurité, et la progression de l'élève.
C'est le document à emmener devant la vraie machine.

---

## Le matériel modélisé

Un PC de bureau **ATX** générique, aux cotes réelles :

- boîtier moyen-tour 22 × 47 × 46 cm ;
- carte mère ATX 305 × 244 mm (socket, 4 slots mémoire, PCIe 16x, M.2, SATA,
  connectique arrière normalisée 158,75 × 44,45 mm) ;
- processeur + ventirad tour, 2 barrettes de mémoire en double canal ;
- carte graphique double slot 267 mm, SSD M.2 2280, disque dur 3,5" ;
- bloc d'alimentation 150 × 86 × 140 mm, 2 ventilateurs 120 mm, pile CMOS.

L'agencement, l'ordre de montage et les gestes décrits correspondent à ce
qu'on retrouve sur une machine réelle.

---

## Utiliser le jeu

### En ligne (GitHub Pages)

Le dépôt contient un workflow GitHub Actions qui publie le site à chaque
`push` sur `main`.

1. Créer un dépôt sur GitHub et y pousser ce dossier.
2. Dans **Settings → Pages**, choisir la source **GitHub Actions**.
3. Le site est publié sur `https://<compte>.github.io/<dépôt>/`.

### Hors ligne (un seul fichier, sans Internet)

```bash
npm run build:offline
```

Produit **`dist-offline/index.html`** : un fichier unique d'environ 1,3 Mo
qui contient tout le jeu. On le copie sur le réseau du collège ou sur une clé
USB, et il s'ouvre par simple double-clic, sans serveur ni connexion.

Le workflow GitHub Actions le publie aussi à côté du site, sous le nom
`Le-PC-hors-ligne.html`.

### En local, pour modifier le jeu

```bash
npm install
npm run dev
```

Puis ouvrir <http://127.0.0.1:5173>.

> **Note Windows** — le dossier parent s'appelle « Applications & web ». Le
> caractère `&` casse la résolution des exécutables de `node_modules/.bin`
> par npm. Les scripts appellent donc `node ./node_modules/vite/bin/vite.js`
> directement plutôt que `vite`. Si vous renommez le dossier sans `&`, vous
> pouvez revenir aux commandes courtes.

Autres commandes :

| Commande | Effet |
|---|---|
| `npm run build` | Site statique dans `dist/` (GitHub Pages) |
| `npm run build:offline` | Fichier HTML autonome dans `dist-offline/` |
| `npm run preview` | Sert le contenu de `dist/` en local |
| `npm run typecheck` | Vérification TypeScript |

---

## Configuration en salle

Le bouton ⚙️ en bas à droite permet de :

- couper les sons ;
- baisser la **qualité d'affichage** (Basse / Moyenne / Élevée) si la 3D
  saccade sur les postes de la salle — la qualité basse désactive les ombres
  et l'anticrénelage ;
- effacer la progression enregistrée sur le poste.

Le jeu est prévu pour une utilisation **souris + clavier** :
clic gauche pour pivoter, clic droit pour déplacer, molette pour zoomer.

---

## Comment c'est fait

- **React 19 + TypeScript + Vite**, rendu 3D avec **three.js** via
  **React Three Fiber** et **drei**.
- **Aucun fichier externe** : les modèles 3D sont construits par programme
  à partir des cotes réelles, les textures (circuits imprimés, tôle brossée,
  étiquettes) sont dessinées dans un `<canvas>` au chargement, et les sons
  sont synthétisés avec l'API Web Audio. C'est ce qui permet de tenir dans
  un seul fichier HTML et de fonctionner sans réseau.
- L'éclairage utilise des panneaux lumineux virtuels (`Lightformer`) plutôt
  qu'une image d'environnement HDRI à télécharger.
- Aucune requête réseau au moment du jeu, aucun cookie, aucun traceur.

### Organisation du code

```
src/
  data/        catalogue pédagogique : composants, câbles, prises,
               périphériques, chapitres, badges
  three/       modèle 3D : cotes (layout.ts), matériaux, textures
               procédurales, modèles (models/), scène (Stage, PcRig)
  game/        les 9 exercices + l'ossature commune (Frame, useExercise)
  ui/          écrans (accueil, parcours, badges, fiche de révision)
  state/       progression sauvegardée (useGame) et maquette en cours (useBuild)
  audio/       effets sonores synthétisés
  styles/      feuilles de style
```

Le fichier **`src/three/layout.ts`** est la source de vérité géométrique :
toutes les cotes, les positions d'emplacement et les cadrages caméra y sont
regroupés. C'est le premier endroit à modifier pour adapter le jeu à une
autre machine.

---

## Adapter à vos machines

Le jeu modélise une tour ATX générique. Pour coller à un parc précis
(Dell OptiPlex, HP ProDesk, format compact…), les points à reprendre sont :

1. `src/three/layout.ts` — cotes du boîtier et positions des emplacements ;
2. `src/three/models/CaseShell.tsx` — forme du boîtier et découpes arrière ;
3. `src/data/components.ts` — `installOrder` et `requires` si l'ordre de
   montage diffère.

Le reste (exercices, progression, fiche) s'adapte automatiquement.
