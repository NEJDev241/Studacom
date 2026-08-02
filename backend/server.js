require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./src/routes/auth.routes");
const servicesRoutes = require("./src/routes/services.routes");
const portfolioRoutes = require("./src/routes/portfolio.routes");
const testimonialsRoutes = require("./src/routes/testimonials.routes");
const quotesRoutes = require("./src/routes/quotes.routes");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 4000;

// Origines autorisées à appeler l'API (le front-end Studacom)
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5500")
  .split(",")
  .map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // autorise les requêtes sans origine (ex: curl, apps mobiles) et les origines listées
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const err = new Error("Origine non autorisée par la politique CORS.");
      err.status = 403;
      callback(err);
    },
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Limite globale anti-abus sur toute l'API
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "studacom-backend", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/testimonials", testimonialsRoutes);
app.use("/api/quotes", quotesRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ API Studacom en écoute sur http://localhost:${PORT}`);
  console.log(`   Origines CORS autorisées : ${allowedOrigins.join(", ")}`);
});
