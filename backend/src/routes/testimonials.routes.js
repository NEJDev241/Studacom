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

// GET /api/testimonials — public, uniquement les témoignages publiés
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM testimonials WHERE published = 1 ORDER BY created_at DESC")
    .all();
  res.json(rows);
});

// GET /api/testimonials/all — admin, y compris non publiés
router.get("/all", requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM testimonials ORDER BY created_at DESC").all());
});

// POST /api/testimonials — admin uniquement
router.post(
  "/",
  requireAuth,
  [
    body("author").trim().isLength({ min: 2, max: 80 }).withMessage("Nom invalide."),
    body("role").optional().trim().isLength({ max: 100 }),
    body("quote").trim().isLength({ min: 5, max: 500 }).withMessage("Avis invalide."),
    body("rating").optional().isInt({ min: 1, max: 5 }),
  ],
  checkValidation,
  (req, res) => {
    const { author, role, quote, rating } = req.body;
    const info = db
      .prepare(
        "INSERT INTO testimonials (author, role, quote, rating) VALUES (?, ?, ?, ?)"
      )
      .run(author, role || null, quote, rating || 5);
    res.status(201).json(db.prepare("SELECT * FROM testimonials WHERE id = ?").get(info.lastInsertRowid));
  }
);

// PUT /api/testimonials/:id — admin (modifier ou publier/dépublier)
router.put(
  "/:id",
  requireAuth,
  [param("id").isInt()],
  checkValidation,
  (req, res) => {
    const existing = db.prepare("SELECT * FROM testimonials WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Témoignage introuvable." });

    const updated = {
      author: req.body.author ?? existing.author,
      role: req.body.role ?? existing.role,
      quote: req.body.quote ?? existing.quote,
      rating: req.body.rating ?? existing.rating,
      published: req.body.published ?? existing.published,
    };

    db.prepare(
      "UPDATE testimonials SET author=?, role=?, quote=?, rating=?, published=? WHERE id=?"
    ).run(updated.author, updated.role, updated.quote, updated.rating, updated.published ? 1 : 0, req.params.id);

    res.json(db.prepare("SELECT * FROM testimonials WHERE id = ?").get(req.params.id));
  }
);

// DELETE /api/testimonials/:id — admin
router.delete("/:id", requireAuth, [param("id").isInt()], checkValidation, (req, res) => {
  const info = db.prepare("DELETE FROM testimonials WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Témoignage introuvable." });
  res.status(204).send();
});

module.exports = router;
