/**
 * AI Routes
 * Maps HTTP endpoints to the AI controller functions.
 * Uses multer to handle multipart image uploads for the solver.
 */

const express = require('express');
const multer = require('multer');
const aiController = require('../controllers/aiController');

const router = express.Router();

// Multer configured for in-memory storage (we pass the buffer to Bedrock)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

// Routes
router.post('/solve-question', upload.single('image'), aiController.solveQuestion);
router.post('/chat', aiController.chat);
router.post('/generate-test', aiController.generateTest);
router.post('/analyze-performance', aiController.analyzePerformance);
router.post('/submit-attempt', aiController.submitAttempt);

module.exports = router;
