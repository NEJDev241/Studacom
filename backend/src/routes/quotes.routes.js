const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, param, query, validationResult } = require("express-validator");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { sendQuoteNotification } = require("../utils/mailer");

const router = express.Router();

function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

// Anti-spam : 5 demandes de devis / heure / IP
const quoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Trop de demandes envoyées. Merci de réessayer plus tard ou de nous contacter par WhatsApp." },
});

// POST /api/quotes — public (formulaire "Demande de devis")
router.post(
  "/",
  quoteLimiter,
  [
    body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Nom invalide."),
    body("phone").trim().isLength({ min: 6, max: 30 }).withMessage("Téléphone invalide."),
    body("email").trim().isEmail().withMessage("Email invalide.").normalizeEmail(),
    body("service").trim().notEmpty().withMessage("Service requis."),
    body("budget").optional().trim(),
    body("description").optional().trim().isLength({ max: 2000 }),
    // honeypot anti-bot : champ caché côté front, doit rester vide
    body("website").optional().isEmpty().withMessage("Requête rejetée."),
  ],
  checkValidation,
  async (req, res, next) => {
    try {
      const { name, phone, email, service, budget, description } = req.body;
      const info = db
        .prepare(
          `INSERT INTO quotes (name, phone, email, service, budget, description)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(name, phone, email, service, budget || null, description || null);

      const quote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(info.lastInsertRowid);

      // L'envoi d'email ne doit jamais faire échouer la requête côté client
      sendQuoteNotification(quote).catch((err) =>
        console.error("Échec envoi email de notification :", err.message)
      );

      res.status(201).json({ message: "Demande envoyée avec succès.", id: quote.id });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/quotes — admin uniquement, liste des demandes reçues
router.get(
  "/",
  requireAuth,
  [query("status").optional().isIn(["nouveau", "en_cours", "traite", "archive"])],
  checkValidation,
  (req, res) => {
    const { status } = req.query;
    const rows = status
      ? db.prepare("SELECT * FROM quotes WHERE status = ? ORDER BY created_at DESC").all(status)
      : db.prepare("SELECT * FROM quotes ORDER BY created_at DESC").all();
    res.json(rows);
  }
);

// PUT /api/quotes/:id — admin, mise à jour du statut de traitement
router.put(
  "/:id",
  requireAuth,
  [
    param("id").isInt(),
    body("status").isIn(["nouveau", "en_cours", "traite", "archive"]).withMessage("Statut invalide."),
  ],
  checkValidation,
  (req, res) => {
    const info = db
      .prepare("UPDATE quotes SET status = ? WHERE id = ?")
      .run(req.body.status, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Demande introuvable." });
    res.json(db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id));
  }
);

// DELETE /api/quotes/:id — admin
router.delete("/:id", requireAuth, [param("id").isInt()], checkValidation, (req, res) => {
  const info = db.prepare("DELETE FROM quotes WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Demande introuvable." });
  res.status(204).send();
});

module.exports = router;
