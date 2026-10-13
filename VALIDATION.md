# Vérifications locales — 13 octobre 2026

- Compilation de production Angular : réussie.
- 4 tests de contenu : réussis (24 séquences, 216 pages, références et cache PWA).
- Parcours Chrome en affichage ordinateur et mobile 390 × 844 : réussi, sans erreur JavaScript ni débordement horizontal.
- Filtres PS/MS, période, domaine, recherche et favoris : vérifiés.
- Lecture texte, recherche dans les guides et pages originales : vérifiées.
- Fiche modifiée, export PDF A4 en 2 pages, conservation après rechargement : vérifiés. Mise en page du PDF inspectée visuellement.
- Export des 6 pages originales de la séquence MS « Les masses » : vérifié avec pypdf.
- Téléchargement complet du guide PS dans le cache : réussi.
- Rechargement hors connexion, consultation du texte et des images téléchargées : réussis.

Le navigateur a été utilisé en simulation mobile ; aucune installation physique sur iPhone/Android n’a été réalisée. Les dépendances et le code restent présents localement. L’hébergement Sites est réservé mais non publié : le contrôle automatique a refusé le transfert des PDF vers le dépôt externe tant que l’utilisateur ne l’a pas explicitement autorisé.

Les artefacts de contrôle sont dans `tmp/qa` (non versionnés). Ils contiennent des notes d’exemple de test, pas des préparations de l’utilisateur.

## Amélioration de la lisibilité

- Navigation agrandie, contrastes renforcés et champs de saisie lisibles sur téléphone.
- Paragraphes recomposés, listes sémantiques, rubriques, étapes et objectifs encadrés dans le lecteur.
- Quatre cartes de jour par séquence ; trois tailles de texte mémorisées sur l’appareil.
- 8 tests de contenu et de mise en forme réussis. Vérification navigateur en 320, 390, 768 et 1440 px, sans débordement horizontal ni erreur JavaScript.
- Nouvelle compilation de production réussie. Captures de contrôle : `tmp/qa/readability`.

## Mise en page alignée sur le manuel

- Vue d’ensemble reconstruite pour les 24 séquences : période/semaine, bandeau orange des objectifs, coin de l’enseignant visible sur fond jaune, cadres Rituels / Classe entière / Ateliers / Coin maths.
- Les cadres, titres et tableaux sont extraits selon leurs positions et couleurs dans les PDF. Les 120 pages de séances détaillées séparent les rubriques, les jours, les étapes et les encadrés Matériel.
- Les tableaux d’énigmes sont lus colonne par colonne, et les cadres se placent sur une seule colonne en affichage mobile. Les 216 textes bruts et pages originales restent conservés.
- 11 tests réussis : contenu existant, 24 vues d’ensemble, association du matériel à sa séance et tableaux d’énigmes sur les quatre jours. Compilation Angular de production réussie.
- Vérification dans le navigateur intégré en 320, 390, 768 et 1280 px : aucun débordement horizontal sur la page de séance contrôlée. Vérification visuelle des cadres et du matériel sur ordinateur et téléphone simulé.
- Liens des ateliers : « Autonome 2 » ouvre bien la sixième page de la séquence ; page originale 46 PS chargée avec succès.
- Taille du texte de 24 px contrôlée en largeur 320 px, sans débordement. Préférence remise à sa valeur initiale après vérification.
