/**
 * Test Repository
 * ---------------
 * Replaces the Mongoose Test model.
 * DynamoDB table: Tests
 *   PK: testId (uuid)
 *   GSI UserIdIndex: userId
 */

const { ddb } = require('./dynamodb');
const { TESTS_TABLE } = require('./tables');
const { PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

/**
 * Persist an AI-generated test to DynamoDB.
 * @returns {object} The stored test item.
 */
async function createTest({ userId, topic, questions }) {
    const now = new Date().toISOString();
    const testId = crypto.randomUUID();

    const item = {
        testId,
        userId: userId || 'guest',
        topic: topic.trim(),
        questions,           // array of { question, options, correctAnswer, explanation }
        createdAt: now,
        updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: TESTS_TABLE, Item: item }));
    return item;
}

/**
 * Retrieve a test by its testId.
 * @returns {object|null}
 */
async function getTestById(testId) {
    const result = await ddb.send(
        new GetCommand({ TableName: TESTS_TABLE, Key: { testId } })
    );
    return result.Item || null;
}

module.exports = { createTest, getTestById };
