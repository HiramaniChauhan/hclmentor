/**
 * Question Repository
 * -------------------
 * Replaces the Mongoose Question model.
 * DynamoDB table: Questions
 *   PK: userId, SK: questionId (uuid)
 */

const { ddb } = require('./dynamodb');
const { QUESTIONS_TABLE } = require('./tables');
const { PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

/**
 * Save a question asked by a student (image solver or chat).
 * @returns {object} The stored question item.
 */
async function createQuestion({ userId, type, question, answer = '', topic = 'General' }) {
    const now = new Date().toISOString();
    const questionId = crypto.randomUUID();

    const item = {
        userId,
        questionId,
        type,     // 'image' | 'chat'
        question,
        answer,
        topic,
        createdAt: now,
        updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: QUESTIONS_TABLE, Item: item }));
    return item;
}

/**
 * Get the most-recent questions for a user.
 * @param {string} userId
 * @param {number} [limit=100]
 * @returns {object[]}
 */
async function getQuestionsByUser(userId, limit = 100) {
    const result = await ddb.send(
        new QueryCommand({
            TableName: QUESTIONS_TABLE,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId },
            ScanIndexForward: false,
        })
    );

    const items = result.Items || [];
    // Sort newest first by createdAt
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return items.slice(0, limit);
}

module.exports = { createQuestion, getQuestionsByUser };
