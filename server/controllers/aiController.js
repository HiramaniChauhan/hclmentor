/**
 * AI Controller
 * Handles HTTP requests for all AI-powered features:
 *   - Image question solving
 *   - Chat tutor
 *   - Practice test generation
 *   - Performance analysis
 *   - Submit attempt
 *
 * All DB operations now use AWS DynamoDB via the repo layer.
 */

const novaService = require('../services/novaService');
const testRepo = require('../db/testRepo');
const attemptRepo = require('../db/attemptRepo');

/**
 * POST /api/solve-question
 * Expects: multipart form with an "image" file field
 * Returns: { extractedQuestion, solution }
 */
async function solveQuestion(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const base64Image = req.file.buffer.toString('base64');
        const result = await novaService.solveFromImage(base64Image);

        return res.json(result);
    } catch (err) {
        console.error('solveQuestion error:', err);
        return res.status(500).json({ error: 'Failed to solve question', details: err.message });
    }
}

/**
 * POST /api/chat
 * Expects: { messages: [{ role: 'user'|'assistant', content: string }] }
 * Returns: { reply: string }
 */
async function chat(req, res) {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        const reply = await novaService.chat(messages);
        return res.json({ reply });
    } catch (err) {
        console.error('chat error:', err);
        return res.status(500).json({ error: 'Chat failed', details: err.message });
    }
}

/**
 * POST /api/generate-test
 * Expects: { topic: string, count?: number, userId?: string }
 * Returns: { test: TestItem }
 */
async function generateTest(req, res) {
    try {
        const { topic, count = 5, userId = null } = req.body;
        if (!topic) {
            return res.status(400).json({ error: 'topic is required' });
        }

        const questions = await novaService.generateTest(topic, count);

        // If Nova returned a string instead of parsed JSON, send it as-is
        if (typeof questions === 'string') {
            return res.json({ raw: questions });
        }

        // Persist the generated test to DynamoDB
        const test = await testRepo.createTest({ userId, topic, questions });
        return res.json({ test });
    } catch (err) {
        console.error('generateTest error:', err);
        return res.status(500).json({ error: 'Test generation failed', details: err.message });
    }
}

/**
 * POST /api/analyze-performance
 * Expects: { userId?: string }
 * Returns: { analysis: string, attempts: Attempt[] }
 */
async function analyzePerformance(req, res) {
    try {
        const { userId = null } = req.body;

        let attempts = [];
        if (userId) {
            attempts = await attemptRepo.getAttemptsByUser(userId, 50);
        } else {
            // Guest: no attempts
            attempts = [];
        }

        if (attempts.length === 0) {
            return res.json({
                analysis: 'No attempts found yet. Take some practice tests first!',
                attempts: [],
            });
        }

        // Enrich attempts with full test data (questions array) from DynamoDB
        for (let i = 0; i < attempts.length; i++) {
            const a = attempts[i];
            if (a.testId) {
                try {
                    const fullTest = await testRepo.getTestById(a.testId);
                    if (fullTest) {
                        attempts[i] = { ...a, testId: fullTest };
                    }
                } catch (err) {
                    console.warn('Failed to fetch test for attempt', a.testId, err.message);
                }
            }
        }

        const analysis = await novaService.analyzePerformance(attempts);
        return res.json({ analysis, attempts });
    } catch (err) {
        console.error('analyzePerformance error:', err);
        return res.status(500).json({ error: 'Analysis failed', details: err.message });
    }
}

/**
 * POST /api/submit-attempt
 * Expects: { testId, topic, answers: [{ questionIndex, selectedAnswer, isCorrect }], score, total, userId? }
 * Returns: { attempt }
 */
async function submitAttempt(req, res) {
    try {
        const { testId, topic, answers, score, total, userId = null } = req.body;
        if (!testId || !topic || !answers || score === undefined || total === undefined) {
            return res.status(400).json({ error: 'testId, topic, answers, score, and total are required' });
        }

        const attempt = await attemptRepo.createAttempt({ userId, testId, topic, answers, score, total });
        return res.json({ attempt });
    } catch (err) {
        console.error('submitAttempt error:', err);
        return res.status(500).json({ error: 'Failed to save attempt', details: err.message });
    }
}

module.exports = {
    solveQuestion,
    chat,
    generateTest,
    analyzePerformance,
    submitAttempt,
};
