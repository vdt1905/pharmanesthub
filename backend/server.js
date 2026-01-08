const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

/* =====================================================
   1️⃣ FORCE CORS HEADERS (Vercel-safe, fail-proof)
   ===================================================== */
app.use((req, res, next) => {
    const allowedOrigins = [
        "https://secure-pdf-viewer-frontend.vercel.app",
        "https://pdf-secure-r528-frontend-last.vercel.app",
        "https://pharmanesthub.vercel.app",
        "https://pharmanesthub.in",
        "http://localhost:5173"
    ];

    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204); // preflight success
    }

    next();
});

/* =====================================================
   2️⃣ Standard CORS middleware (double safety)
   ===================================================== */
app.use(cors({
    origin: [
        "https://secure-pdf-viewer-frontend.vercel.app",
        "https://pdf-secure-r528-frontend-last.vercel.app",
        "https://pharmanesthub.in",
        "http://localhost:5173"
    ],
    credentials: true
}));

/* =====================================================
   3️⃣ Security + Body Parsers
   ===================================================== */
app.use(helmet({
    crossOriginResourcePolicy: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================================================
   4️⃣ Routes
   ===================================================== */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/pdfs", require("./routes/pdfRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
// app.use("/api/security", require("./routes/securityRoutes"));

app.get("/", (req, res) => {
    res.send("Secure PDF Viewer API is running");
});

/* =====================================================
   5️⃣ Error handler (still sends CORS headers)
   ===================================================== */
app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(err.statusCode || 500).json({
        message: err.message || "Internal Server Error"
    });
});

/* =====================================================
   6️⃣ Export for Vercel & Local Start
   ===================================================== */
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;