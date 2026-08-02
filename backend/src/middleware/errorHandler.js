// Middleware global de gestion d'erreurs — toute erreur non interceptée
// (synchrone dans une route, ou passée via next(err)) atterrit ici.
function errorHandler(err, req, res, next) {
  console.error(`[ERREUR] ${req.method} ${req.originalUrl} —`, err.message);

  const status = err.status || 500;
  const message =
    status === 500 ? "Une erreur interne est survenue." : err.message;

  res.status(status).json({ error: message });
}

// Capture les routes non trouvées (404)
function notFound(req, res) {
  res.status(404).json({ error: "Ressource introuvable." });
}

module.exports = { errorHandler, notFound };
