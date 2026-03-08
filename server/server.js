/**
 * Server Entry Point
 * -------------------
 * Express application that:
 *   1. Loads environment variables from .env
 *   2. Validates DynamoDB connectivity on startup
 *   3. Mounts AI and User API routes
 *   4. Starts listening on the configured PORT
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { client } = require('./db/dynamodb');
const { ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const aiRoutes = require('./routes/aiRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ----- Middleware -----
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ----- API Routes -----
app.use('/api', aiRoutes);
app.use('/api/users', userRoutes);

// ----- Health Check -----
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: 'dynamodb', timestamp: new Date().toISOString() });
});

// ----- DynamoDB Connectivity Check + Server Start -----
async function startServer() {
    try {
        // Lightweight check: list tables to confirm credentials work
        const result = await client.send(new ListTablesCommand({}));
        console.log(`✅ DynamoDB connected — tables: ${result.TableNames.join(', ') || '(none yet)'}`);
    } catch (err) {
        console.warn(`⚠️  DynamoDB check failed: ${err.message}`);
        console.warn('   Make sure AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are set in .env');
    }

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

// Handle SIGTERM for graceful shutdown (App Runner/Docker)
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

startServer();

module.exports = app;
