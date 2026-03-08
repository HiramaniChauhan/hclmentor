/**
 * User Routes
 * Handles: register (with OTP), login, forgot-password, reset-password,
 *          send-otp, verify-otp, attempts, questions, leaderboard.
 *
 * All DB operations now use AWS DynamoDB via the repo layer.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userRepo = require('../db/userRepo');
const attemptRepo = require('../db/attemptRepo');
const questionRepo = require('../db/questionRepo');
const { sendOTP, verifyOTP } = require('../services/otpService');

const router = express.Router();

// ── Password strength validator ───────────────────────────────────────────────
function validatePassword(password) {
    return {
        minLength: password.length >= 8,
        hasUpper: /[A-Z]/.test(password),
        hasLower: /[a-z]/.test(password),
        hasDigit: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
    };
}
function isStrongPassword(password) {
    const c = validatePassword(password);
    return c.minLength && c.hasUpper && c.hasLower && c.hasDigit && c.hasSpecial;
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Send OTP (for signup or reset)
// POST /api/users/send-otp
// Body: { email, purpose: 'signup' | 'reset' }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/send-otp', async (req, res) => {
    try {
        const { email, purpose = 'signup' } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        if (purpose === 'signup') {
            const existing = await userRepo.getUserByEmail(email);
            if (existing) return res.status(409).json({ error: 'Email already registered' });
        }

        if (purpose === 'reset') {
            const existing = await userRepo.getUserByEmail(email);
            if (!existing) return res.status(404).json({ error: 'No account found with this email' });
        }

        await sendOTP(email, purpose);
        return res.json({ message: 'OTP sent to your email' });
    } catch (err) {
        console.error('send-otp error:', err);
        return res.status(500).json({ error: 'Failed to send OTP', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2a — Register (with OTP verification)
// POST /api/users/register
// Body: { name, email, password, otp }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;
        if (!name || !email || !password || !otp) {
            return res.status(400).json({ error: 'name, email, password, and otp are required' });
        }

        // Verify OTP
        const otpResult = verifyOTP(email, otp, 'signup');
        if (!otpResult.valid) {
            return res.status(400).json({ error: otpResult.error });
        }

        // Strong password check
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                error: 'Password is too weak',
                details: 'Must be 8+ chars with uppercase, lowercase, digit, and special character.',
            });
        }

        const existing = await userRepo.getUserByEmail(email);
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const user = await userRepo.createUser({ name, email, password });
        const token = jwt.sign({ id: user.userId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });

        return res.status(201).json({ user: { id: user.userId, name: user.name, email: user.email }, token });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Registration failed', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// Login
// POST /api/users/login
// ══════════════════════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

        const user = await userRepo.getUserByEmail(email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await userRepo.comparePassword(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.userId }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        return res.json({ user: { id: user.userId, name: user.name, email: user.email }, token });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// Reset Password (after OTP verified)
// POST /api/users/reset-password
// Body: { email, otp, newPassword }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'email, otp, and newPassword are required' });
        }

        // Verify OTP
        const otpResult = verifyOTP(email, otp, 'reset');
        if (!otpResult.valid) {
            return res.status(400).json({ error: otpResult.error });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                error: 'Password is too weak',
                details: 'Must be 8+ chars with uppercase, lowercase, digit, and special character.',
            });
        }

        const user = await userRepo.getUserByEmail(email);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Hash new password and update
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await userRepo.updateUserPassword(user.userId, hashedPassword);

        return res.json({ message: 'Password reset successfully! You can now sign in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Password reset failed', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// Attempts
// GET /api/users/:id/attempts
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id/attempts', async (req, res) => {
    try {
        const attempts = await attemptRepo.getAttemptsByUser(req.params.id);
        return res.json({ attempts });
    } catch (err) {
        console.error('Fetch attempts error:', err);
        return res.status(500).json({ error: 'Failed to fetch attempts', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// Questions
// POST /api/users/questions
// GET  /api/users/:id/questions
// ══════════════════════════════════════════════════════════════════════════════
router.post('/questions', async (req, res) => {
    try {
        const { userId, type, question, answer, topic } = req.body;
        if (!userId || !type || !question) return res.status(400).json({ error: 'userId, type, and question are required' });
        const q = await questionRepo.createQuestion({ userId, type, question, answer, topic });
        return res.status(201).json({ question: q });
    } catch (err) {
        console.error('Save question error:', err);
        return res.status(500).json({ error: 'Failed to save question', details: err.message });
    }
});

router.get('/:id/questions', async (req, res) => {
    try {
        const questions = await questionRepo.getQuestionsByUser(req.params.id);
        return res.json({ questions });
    } catch (err) {
        console.error('Fetch questions error:', err);
        return res.status(500).json({ error: 'Failed to fetch questions', details: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// Leaderboard — Top 10 by accuracy of last 10 tests (in-memory aggregation)
// GET /api/users/leaderboard?userId=<id>
// ══════════════════════════════════════════════════════════════════════════════
router.get('/leaderboard', async (req, res) => {
    try {
        const { userId } = req.query;

        // Fetch all attempts and compute per-user stats in memory
        const allAttempts = await attemptRepo.getAllAttemptsForLeaderboard();

        // Group by userId — keep most recent 10 per user
        const userMap = {};
        for (const a of allAttempts) {
            if (!a.userId || a.userId === 'guest') continue;
            if (!userMap[a.userId]) userMap[a.userId] = [];
            userMap[a.userId].push(a);
        }

        // For each user: sort newest first, slice 10, compute accuracy
        const rankings = [];
        for (const [uid, attempts] of Object.entries(userMap)) {
            attempts.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
            const recent = attempts.slice(0, 10);
            const totalCorrect = recent.reduce((s, a) => s + (a.score || 0), 0);
            const totalQuestions = recent.reduce((s, a) => s + (a.total || 0), 0);
            if (totalQuestions === 0) continue;
            const accuracy = Math.round((totalCorrect / totalQuestions) * 1000) / 10;
            rankings.push({ userId: uid, accuracy, testsCount: attempts.length });
        }

        // Sort: accuracy desc, then testsCount desc
        rankings.sort((a, b) => b.accuracy - a.accuracy || b.testsCount - a.testsCount);

        // Fetch names for top-ranking users
        const { getUserById } = require('../db/userRepo');
        const top = rankings.slice(0, 10);
        const ranked = await Promise.all(
            top.map(async (entry, i) => {
                const user = await getUserById(entry.userId).catch(() => null);
                return {
                    rank: i + 1,
                    userId: entry.userId,
                    name: user ? user.name : 'Unknown',
                    accuracy: entry.accuracy,
                    testsCount: entry.testsCount,
                };
            })
        );

        // Find requesting user's rank
        let myRank = null;
        if (userId) {
            const idx = rankings.findIndex((e) => e.userId === userId);
            myRank = idx >= 0 ? idx + 1 : null;
        }

        return res.json({ leaderboard: ranked, myRank, total: rankings.length });
    } catch (err) {
        console.error('Leaderboard error:', err);
        return res.status(500).json({ error: 'Failed to fetch leaderboard', details: err.message });
    }
});

module.exports = router;
