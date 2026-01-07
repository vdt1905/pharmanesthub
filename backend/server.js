const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

const allowedOrigins = new Set([
    "https://secure-pdf-viewer-frontend.vercel.app",
    "https://pdf-secure-r528-frontend-last.vercel.app",
    "http://localhost:5173"
]);

const corsOptions = {
    origin: (origin, cb) => {
        // allow requests like curl/postman (no origin)
        if (!origin) return cb(null, true);
        return cb(null, allowedOrigins.has(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // IMPORTANT for preflight

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/pdfs", require("./routes/pdfRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/security", require("./routes/securityRoutes"));

app.get("/api", (req, res) => res.send("API running"));

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
});

module.exports = app;
