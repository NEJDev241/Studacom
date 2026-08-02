const jwt = require("jsonwebtoken");

/**
 * Protège une route : exige un header "Authorization: Bearer <token>"
 * contenant un JWT valide signé avec JWT_SECRET.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentification requise." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session invalide ou expirée." });
  }
}

module.exports = { requireAuth };
