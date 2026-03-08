/**
 * User Repository
 * ---------------
 * Replaces the Mongoose User model.
 * DynamoDB table: Users
 *   PK: userId (uuid)
 *   GSI EmailIndex: email → full item
 */

const { ddb } = require('./dynamodb');
const { USERS_TABLE } = require('./tables');
const {
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Create a new user. Hashes the password before storing.
 * @returns {object} The created user item (without raw password).
 */
async function createUser({ name, email, password }) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();

    const item = {
        userId,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
    };

    await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));

    const { password: _p, ...safeUser } = item;
    return safeUser;
}

/**
 * Find a user by email using the EmailIndex GSI.
 * @returns {object|null}
 */
async function getUserByEmail(email) {
    const result = await ddb.send(
        new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: 'EmailIndex',
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: { ':email': email.toLowerCase().trim() },
            Limit: 1,
        })
    );
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

/**
 * Find a user by userId (primary key).
 * @returns {object|null}
 */
async function getUserById(userId) {
    const result = await ddb.send(
        new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );
    return result.Item || null;
}

/**
 * Update a user's password (already hashed).
 */
async function updateUserPassword(userId, newHashedPassword) {
    await ddb.send(
        new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { userId },
            UpdateExpression: 'SET #pw = :pw, updatedAt = :ts',
            ExpressionAttributeNames: { '#pw': 'password' },
            ExpressionAttributeValues: {
                ':pw': newHashedPassword,
                ':ts': new Date().toISOString(),
            },
        })
    );
}

/**
 * Compare a plain-text password against the stored hash.
 */
async function comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    updateUserPassword,
    comparePassword,
};
