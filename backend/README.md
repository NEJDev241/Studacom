# Studacom — Backend API

API REST pour le site Studacom : services, portfolio, témoignages, demandes de
devis, et authentification de l'espace admin.

**Stack** : Node.js + Express + SQLite (`better-sqlite3`). Base de données
fichier, aucun serveur externe à installer — l'API est prête à l'emploi en
quelques commandes.

---

## 1. Installation

```bash
cd studacom-backend
npm install
cp .env.example .env
```

Ouvrez `.env` et modifiez au minimum :
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — identifiants du 1er compte admin
- `JWT_SECRET` — générez une valeur aléatoire :
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `CORS_ORIGIN` — l'adresse depuis laquelle le site sera servi (ex : URL de
  votre hébergement, ou `http://127.0.0.1:5500` en local)

## 2. Initialiser les données

```bash
npm run seed
```

Crée les tables, insère les services/portfolio/témoignages par défaut, et
crée le compte admin défini dans `.env`. Peut être relancé sans danger : il
n'écrase rien si des données existent déjà.

## 3. Lancer le serveur

```bash
npm run dev     # avec redémarrage automatique (développement)
npm start       # démarrage simple (production)
```

L'API est alors disponible sur `http://localhost:4000/api`.

## 4. Brancher le site (frontend)

Dans `assets/config.js` du site, indiquez l'URL de l'API :

```js
window.STUDACOM_API_BASE = "http://localhost:4000/api"; // ou votre URL de prod
```

Ouvrez ensuite `index.html` (par ex. avec l'extension VSCode "Live Server",
ou `python3 -m http.server 5500`). Le site charge alors automatiquement ses
services, son portfolio et ses témoignages depuis l'API. Si l'API est
injonctionable, le site garde des valeurs par défaut pour ne jamais s'afficher
vide.

L'espace `admin.html` permet de se connecter (identifiants du `.env`) et de
gérer services, portfolio, témoignages et demandes de devis reçues.

---

## Endpoints de l'API

Toutes les routes sont préfixées par `/api`.

| Méthode | Route                  | Accès  | Description                                  |
|---------|-------------------------|--------|-----------------------------------------------|
| GET     | `/health`               | public | Vérifie que l'API répond                      |
| POST    | `/auth/login`           | public | Connexion admin → renvoie un token JWT         |
| GET     | `/services`             | public | Liste des services                             |
| POST    | `/services`             | admin  | Créer un service                               |
| PUT     | `/services/:id`         | admin  | Modifier un service                            |
| DELETE  | `/services/:id`         | admin  | Supprimer un service                           |
| GET     | `/portfolio`            | public | Liste des réalisations                         |
| POST    | `/portfolio`            | admin  | Créer une réalisation                          |
| PUT     | `/portfolio/:id`        | admin  | Modifier une réalisation                       |
| DELETE  | `/portfolio/:id`        | admin  | Supprimer une réalisation                      |
| GET     | `/testimonials`         | public | Témoignages publiés                            |
| GET     | `/testimonials/all`     | admin  | Tous les témoignages (publiés ou non)          |
| POST    | `/testimonials`         | admin  | Créer un témoignage                            |
| PUT     | `/testimonials/:id`     | admin  | Modifier / publier un témoignage               |
| DELETE  | `/testimonials/:id`     | admin  | Supprimer un témoignage                        |
| POST    | `/quotes`                | public | Soumettre une demande de devis                 |
| GET     | `/quotes`                | admin  | Liste des demandes reçues                      |
| PUT     | `/quotes/:id`            | admin  | Changer le statut d'une demande                |
| DELETE  | `/quotes/:id`            | admin  | Supprimer une demande                          |

Les routes **admin** exigent l'en-tête `Authorization: Bearer <token>` obtenu
via `/auth/login`.

---

## Sécurité mise en place

- Mots de passe admin hachés avec `bcrypt` (jamais stockés en clair)
- Sessions admin par JWT signé, expirant après 8h
- `helmet` : en-têtes de sécurité HTTP (CSP, HSTS, anti-clickjacking...)
- CORS restreint aux origines listées dans `CORS_ORIGIN`
- Limitation de débit (`express-rate-limit`) :
  - connexion admin : 10 tentatives / 15 min / IP (anti brute-force)
  - envoi de devis : 5 / heure / IP (anti-spam)
  - API globale : 300 requêtes / 15 min / IP
- Validation stricte de toutes les entrées (`express-validator`)
- Champ honeypot sur le formulaire de devis (anti-bot)

## Notification email des nouveaux devis

Si `SMTP_HOST` est renseigné dans `.env`, chaque nouvelle demande de devis
envoie un email à `MAIL_TO` (par défaut `ogmbindustrie@gmail.com`). Sans
configuration SMTP, les demandes restent enregistrées en base et visibles
dans l'admin — seul l'email n'est pas envoyé (message journalisé en console
à la place).

Exemple de configuration avec Gmail (mot de passe d'application requis, pas
le mot de passe du compte) :
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-adresse@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx
```

---

## Déploiement en production

1. Hébergez ce dossier sur un service Node.js (Railway, Render, VPS avec PM2,
   etc.). Le fichier SQLite (`data/studacom.db`) doit se trouver sur un
   disque persistant (attention aux plateformes à système de fichiers
   éphémère).
2. Définissez les variables d'environnement de `.env.example` sur la
   plateforme d'hébergement (ne jamais committer `.env`).
3. Mettez à jour `CORS_ORIGIN` avec le(s) domaine(s) réel(s) du site.
4. Mettez à jour `window.STUDACOM_API_BASE` dans `assets/config.js` du
   frontend avec l'URL publique de l'API (HTTPS obligatoire en production).
5. Placez l'API derrière un reverse proxy HTTPS (Nginx, Caddy, ou le HTTPS
   automatique fourni par la plateforme choisie).

### Migrer vers MySQL ou MongoDB

Toute la logique d'accès aux données passe par `src/db.js` et les requêtes
SQL des fichiers `src/routes/*.js`. Pour migrer :
- **MySQL** : remplacer `better-sqlite3` par `mysql2`, adapter `db.js` pour
  exposer une connexion/pool, et ajuster la syntaxe SQL (proche à 95 %).
- **MongoDB** : remplacer `db.js` par une connexion Mongoose, définir des
  schémas `Service`, `PortfolioItem`, `Testimonial`, `Quote`, et remplacer les
  requêtes SQL par leurs équivalents Mongoose dans chaque route.
Le reste de l'API (routes, validation, auth, sécurité) reste inchangé.

---

## Structure du projet

```
studacom-backend/
├── server.js                 # point d'entrée Express
├── src/
│   ├── db.js                 # connexion + schéma SQLite
│   ├── seed.js                # données par défaut + création admin
│   ├── middleware/
│   │   ├── auth.js            # vérification JWT
│   │   └── errorHandler.js    # gestion centralisée des erreurs
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── services.routes.js
│   │   ├── portfolio.routes.js
│   │   ├── testimonials.routes.js
│   │   └── quotes.routes.js
│   └── utils/
│       └── mailer.js          # notification email des devis
├── data/                      # base SQLite (créée automatiquement)
├── .env.example
└── package.json
```
