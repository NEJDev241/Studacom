const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const db = require("../db");

const router = express.Router();

// Anti brute-force : 10 tentatives / 15 min / IP sur la connexion admin
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop de tentatives. Réessayez dans quelques minutes." },
});

router.post(
  "/login",
  loginLimiter,
  [
    body("username").trim().notEmpty().withMessage("Nom d'utilisateur requis."),
    body("password").notEmpty().withMessage("Mot de passe requis."),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;
    const user = db
      .prepare("SELECT * FROM admin_users WHERE username = ?")
      .get(username);

    // Même message générique que l'utilisateur existe ou non (anti énumération)
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token, expiresIn: "8h", username: user.username });
  }
);

module.exports = router;
