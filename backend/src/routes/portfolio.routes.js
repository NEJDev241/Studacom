const express = require("express");
const { body, param, validationResult } = require("express-validator");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const CATEGORIES = ["logo", "flyer", "social", "web", "video"];

function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

// GET /api/portfolio — public
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM portfolio_items ORDER BY position ASC, id ASC")
    .all();
  res.json(rows);
});

// POST /api/portfolio — admin uniquement
router.post(
  "/",
  requireAuth,
  [
    body("category").isIn(CATEGORIES).withMessage("Catégorie invalide."),
    body("label").trim().isLength({ min: 2, max: 120 }).withMessage("Titre invalide."),
    body("image_url").optional({ checkFalsy: true }).isURL().withMessage("URL d'image invalide."),
  ],
  checkValidation,
  (req, res) => {
    const { category, label, image_url } = req.body;
    const maxPos = db.prepare("SELECT MAX(position) AS m FROM portfolio_items").get().m;
    const info = db
      .prepare(
        "INSERT INTO portfolio_items (category, label, image_url, position) VALUES (?, ?, ?, ?)"
      )
      .run(category, label, image_url || null, (maxPos ?? -1) + 1);
    res.status(201).json(
      db.prepare("SELECT * FROM portfolio_items WHERE id = ?").get(info.lastInsertRowid)
    );
  }
);

// PUT /api/portfolio/:id — admin uniquement
router.put(
  "/:id",
  requireAuth,
  [
    param("id").isInt(),
    body("category").optional().isIn(CATEGORIES),
    body("label").optional().trim().isLength({ min: 2, max: 120 }),
    body("image_url").optional({ checkFalsy: true }).isURL(),
    body("position").optional().isInt(),
  ],
  checkValidation,
  (req, res) => {
    const existing = db.prepare("SELECT * FROM portfolio_items WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Réalisation introuvable." });

    const updated = {
      category: req.body.category ?? existing.category,
      label: req.body.label ?? existing.label,
      image_url: req.body.image_url ?? existing.image_url,
      position: req.body.position ?? existing.position,
    };

    db.prepare(
      "UPDATE portfolio_items SET category=?, label=?, image_url=?, position=?, updated_at=datetime('now') WHERE id=?"
    ).run(updated.category, updated.label, updated.image_url, updated.position, req.params.id);

    res.json(db.prepare("SELECT * FROM portfolio_items WHERE id = ?").get(req.params.id));
  }
);

// DELETE /api/portfolio/:id — admin uniquement
router.delete(
  "/:id",
  requireAuth,
  [param("id").isInt()],
  checkValidation,
  (req, res) => {
    const info = db.prepare("DELETE FROM portfolio_items WHERE id = ?").run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Réalisation introuvable." });
    res.status(204).send();
  }
);

module.exports = router;
