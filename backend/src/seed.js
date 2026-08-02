/**
 * Script d'initialisation des données.
 * Usage : npm run seed
 * - Insère les services / portfolio / témoignages par défaut si les tables sont vides.
 * - Crée le compte admin défini dans .env (ADMIN_USERNAME / ADMIN_PASSWORD) s'il n'existe pas.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");

function seedServices() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM services").get().n;
  if (count > 0) return console.log("→ services déjà présents, ignoré.");

  const rows = [
    ["🎨", "Création de contenu", "Visuels, montages et contenus percutants avec Canva, IA, Photoshop et CapCut."],
    ["📱", "Gestion des réseaux sociaux", "Planification, publication et animation de vos pages Facebook, Instagram, TikTok."],
    ["🎤", "Communication média", "Maîtrise de cérémonie, présentation et animation pour vos événements."],
    ["🖌️", "Identité visuelle", "Logos, flyers, cartes de visite et chartes graphiques qui vous ressemblent."],
    ["💻", "Création de sites web", "Sites vitrines et applications web modernes, rapides et responsives."],
    ["📢", "Marketing digital", "Stratégies et campagnes pour développer votre visibilité et vos ventes."],
    ["📸", "Photographie & vidéo", "Prises de vue et montages vidéo professionnels pour vos projets."],
  ];
  const insert = db.prepare(
    "INSERT INTO services (icon, title, description, position) VALUES (?, ?, ?, ?)"
  );
  rows.forEach((r, i) => insert.run(r[0], r[1], r[2], i));
  console.log(`→ ${rows.length} services insérés.`);
}

function seedPortfolio() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM portfolio_items").get().n;
  if (count > 0) return console.log("→ portfolio déjà présent, ignoré.");

  const rows = [
    ["logo", "Logo — Identité de marque"],
    ["flyer", "Flyer — Campagne événement"],
    ["social", "Publication — Réseaux sociaux"],
    ["web", "Site web — Vitrine entreprise"],
    ["video", "Vidéo — Promotion produit"],
    ["logo", "Logo — Startup locale"],
    ["flyer", "Flyer — Offre commerciale"],
    ["web", "Site web — Portfolio"],
  ];
  const insert = db.prepare(
    "INSERT INTO portfolio_items (category, label, position) VALUES (?, ?, ?)"
  );
  rows.forEach((r, i) => insert.run(r[0], r[1], i));
  console.log(`→ ${rows.length} réalisations insérées.`);
}

function seedTestimonials() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM testimonials").get().n;
  if (count > 0) return console.log("→ témoignages déjà présents, ignoré.");

  const rows = [
    ["A. Nzeng", "Entrepreneure, Libreville", "Studacom a redonné une vraie identité à notre marque. Réactifs, professionnels et à l'écoute de nos besoins du début à la fin.", 5],
    ["M. Obame", "Gérant, PME locale", "Notre présence sur les réseaux a totalement changé depuis qu'on travaille avec eux. Un vrai gain de temps et de qualité.", 5],
    ["S. Mba", "Association, Akanda", "Site livré rapidement, propre et responsive. L'équipe explique bien chaque étape, on se sent accompagné.", 5],
  ];
  const insert = db.prepare(
    "INSERT INTO testimonials (author, role, quote, rating) VALUES (?, ?, ?, ?)"
  );
  rows.forEach((r) => insert.run(r[0], r[1], r[2], r[3]));
  console.log(`→ ${rows.length} témoignages insérés.`);
}

function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn("⚠ ADMIN_USERNAME / ADMIN_PASSWORD absents du .env — compte admin non créé.");
    return;
  }
  const existing = db.prepare("SELECT id FROM admin_users WHERE username = ?").get(username);
  if (existing) return console.log("→ compte admin déjà existant, ignoré.");

  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)").run(username, hash);
  console.log(`→ compte admin "${username}" créé.`);
}

seedServices();
seedPortfolio();
seedTestimonials();
seedAdmin();
console.log("Seed terminé.");
