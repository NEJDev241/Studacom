const express = require("express");
const { body, param, validationResult } = require("express-validator");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

// GET /api/services — public, utilisé par la page d'accueil
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM services ORDER BY position ASC, id ASC")
    .all();
  res.json(rows);
});

// POST /api/services — admin uniquement
router.post(
  "/",
  requireAuth,
  [
    body("icon").trim().notEmpty().withMessage("Icône requise."),
    body("title").trim().isLength({ min: 2, max: 100 }).withMessage("Titre invalide."),
    body("description").trim().isLength({ min: 2, max: 400 }).withMessage("Description invalide."),
  ],
  checkValidation,
  (req, res) => {
    const { icon, title, description } = req.body;
    const maxPos = db.prepare("SELECT MAX(position) AS m FROM services").get().m;
    const info = db
      .prepare(
        "INSERT INTO services (icon, title, description, position) VALUES (?, ?, ?, ?)"
      )
      .run(icon, title, description, (maxPos ?? -1) + 1);
    const created = db
      .prepare("SELECT * FROM services WHERE id = ?")
      .get(info.lastInsertRowid);
    res.status(201).json(created);
  }
);

// PUT /api/services/:id — admin uniquement
router.put(
  "/:id",
  requireAuth,
  [
    param("id").isInt().withMessage("Identifiant invalide."),
    body("icon").optional().trim().notEmpty(),
    body("title").optional().trim().isLength({ min: 2, max: 100 }),
    body("description").optional().trim().isLength({ min: 2, max: 400 }),
    body("position").optional().isInt(),
  ],
  checkValidation,
  (req, res) => {
    const existing = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Service introuvable." });

    const updated = {
      icon: req.body.icon ?? existing.icon,
      title: req.body.title ?? existing.title,
      description: req.body.description ?? existing.description,
      position: req.body.position ?? existing.position,
    };

    db.prepare(
      "UPDATE services SET icon=?, title=?, description=?, position=?, updated_at=datetime('now') WHERE id=?"
    ).run(updated.icon, updated.title, updated.description, updated.position, req.params.id);

    res.json(db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id));
  }
);

// DELETE /api/services/:id — admin uniquement
router.delete(
  "/:id",
  requireAuth,
  [param("id").isInt().withMessage("Identifiant invalide.")],
  checkValidation,
  (req, res) => {
    const info = db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Service introuvable." });
    res.status(204).send();
  }
);

module.exports = router;
