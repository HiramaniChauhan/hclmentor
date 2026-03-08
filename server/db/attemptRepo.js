/**
 * Attempt Repository
 * ------------------
 * Replaces the Mongoose Attempt model.
 * DynamoDB table: Attempts
 *   PK: userId, SK: attemptId (uuid)
 *   GSI TestIdIndex: testId
 */

const { ddb } = require('./dynamodb');
const { ATTEMPTS_TABLE } = require('./tables');
const { PutCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

/**
 * Save a completed (or partial) test attempt.
 * @returns {object} The stored attempt item.
 */
async function createAttempt({ userId, testId, topic, answers, score, total }) {
    const now = new Date().toISOString();
    const attemptId = crypto.randomUUID();

    const item = {
        userId: userId || 'guest',
        attemptId,
        testId,
        topic,
        answers,   // [{ questionIndex, selectedAnswer, isCorrect }]
        score,
        total,
        createdAt: now,
        updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: ATTEMPTS_TABLE, Item: item }));
    return item;
}

/**
 * Get all attempts for a specific user, sorted newest-first (client-side).
 * @param {string} userId
 * @param {number} [limit=50]
 * @returns {object[]}
 */
async function getAttemptsByUser(userId, limit = 50) {
    const result = await ddb.send(
        new QueryCommand({
            TableName: ATTEMPTS_TABLE,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId },
            ScanIndexForward: false,  // newest first (by SK which is uuid, not time)
        })
    );

    const items = result.Items || [];
    // Sort by createdAt descending (uuid SK doesn't guarantee time order)
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return items.slice(0, limit);
}

/**
 * Scan ALL attempts across all users — used for the leaderboard.
 * In-memory aggregation replaces the MongoDB $group pipeline.
 * @returns {object[]}
 */
async function getAllAttemptsForLeaderboard() {
    const allItems = [];
    let lastKey;

    do {
        const result = await ddb.send(
            new ScanCommand({
                TableName: ATTEMPTS_TABLE,
                ExclusiveStartKey: lastKey,
            })
        );
        allItems.push(...(result.Items || []));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    return allItems;
}

module.exports = { createAttempt, getAttemptsByUser, getAllAttemptsForLeaderboard };
