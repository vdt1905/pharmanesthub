const express = require('express');
const cors = require('cors'); // Restart trigger
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: ["https://pdf-secure-r528-frontend-last.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/authRoutes');

const pdfRoutes = require('./routes/pdfRoutes');
const groupRoutes = require('./routes/groupRoutes');
const securityRoutes = require('./routes/securityRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/security', securityRoutes);

app.get('/', (req, res) => {
    res.send('Secure PDF Viewer API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Structured JSON error response
    res.status(status).json({
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
