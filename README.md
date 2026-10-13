# Maths en poche

PWA Angular 22 en français pour consulter les guides **Outils pour les Maths PS et MS (Magnard)** fournis par l’utilisateur et préparer des fiches de séquence.

## Ce qui est inclus

- 216 pages : 108 par guide, chacune avec texte intégral extrait et reproduction visuelle.
- 24 séquences : 6 semaines × 2 périodes × 2 niveaux, indexées par domaine.
- Recherche sans accents dans les séquences et dans chaque guide ; filtres niveau / période / domaine ; favoris.
- Lecture mobile en texte ou page originale. Repères annuels accessibles directement.
- Fiches modifiables : objectifs, matériel, déroulement, différenciation, évaluation, notes, date et classe. Enregistrement automatique local.
- Export PDF A4 de la fiche ; export séparé des 6 pages originales d’une séquence.
- Sauvegarde JSON avec import/fusion pour changer de navigateur ou d’appareil.
- Manifeste installable et service worker Angular. Application et textes mis en cache dès l’installation du service worker ; images et PDF téléchargés à la demande (bouton « Garder tout hors connexion »).

## Lancer

Node.js 24 LTS recommandé.

```sh
npm ci
npm start
```

Pour tester le **mode PWA** (service worker désactivé avec le serveur de développement) :

```sh
npm run build
npm run preview
```

Ouvrir http://localhost:4200. Sur un téléphone, utiliser un hébergement HTTPS. L’accès HTTP par IP locale ne permet pas de valider l’installation ni le service worker. Sur iOS : Safari → Partager → Sur l’écran d’accueil. Sur Android : Chrome → Installer l’application.

## Contenu et limites des sources

Les deux fichiers transmis s’arrêtent à la page 108. Le sommaire et la progression mentionnent les périodes 3 à 5, mais leurs séances ne sont pas présentes. Aucun contenu absent n’est inventé. Les ressources complémentaires externes (cahier, matériel, mémo) restent des références et ne sont pas importées.

**Anomalie conservée et signalée :** la page 108 du guide MS présente des activités de composition du nombre 4 dans la séquence « Représenter la classe ». La fiche reprend les rubriques de la séquence ; les originaux restent la référence.

L’extraction utilise l’ordre de lecture du PDF, qui peut être imperfectible pour les colonnes, tableaux ou documents miniatures. Le bouton Page originale restitue toute la page. Les fiches sont préremplies à partir de la vue hebdomadaire et des encadrés de matériel ; elles sont une préparation modifiable, pas une retranscription exhaustive de toutes les séances. L’évaluation et les notes sont personnelles.

Les contenus fournis sont conservés pour cet espace personnel. L’application ne représente pas l’éditeur Magnard.

## Données personnelles

Aucun compte applicatif ni base de données serveur. Les préparations et favoris sont dans `localStorage` sous `maths-poche-v1`. Ils ne sont pas synchronisés automatiquement. Exportez une sauvegarde avant de vider les données du navigateur. L’import valide le format et fusionne les fiches par identifiant en conservant la date de modification la plus récente. Le téléchargement complet d’un guide occupe environ 30 Mo ; le cache du navigateur peut être libéré par le système.

## Import reproductible

```sh
python3 -m pip install pdfplumber pypdfium2 Pillow
python3 scripts/import_guides.py '/chemin/guide PS.pdf' '/chemin/guide MS.pdf'
```

Les PDF sont lus comme des données. Le script préserve les originaux, extrait les encadrés de matériel selon leur position, et génère les images de page. Les sources sont décrites dans `public/data/catalog.json`.

## Vérifications

```sh
npm test
npm run build
```

Le parcours navigateur `tests/browser-check.mjs` utilise Playwright et Chrome. Avec le serveur de production lancé, installer Playwright pour votre environnement puis exécuter `node tests/browser-check.mjs`. On peut fournir `PLAYWRIGHT_PACKAGE` vers un `package.json` du module Playwright préinstallé. Il vérifie filtres, favoris, lecture, deux exports PDF, sauvegarde après rechargement, mode hors connexion, mobile et erreurs JavaScript. Les résultats et PDF de test sont dans `tmp/qa` (ignoré par Git).

## Structure

- `src/app/app.component.*` : navigation, bibliothèque, éditeur et stockage local.
- `src/app/pdf-export.ts` : composition et pagination des fiches, extraction des pages sources.
- `public/data` : index et textes des guides.
- `public/pages` : pages originales rendues en WebP.
- `public/guides` : les deux PDF fournis.
- `ngsw-config.json` : politique de cache hors connexion.
- `.openai/hosting.json` : hébergement privé Sites.
