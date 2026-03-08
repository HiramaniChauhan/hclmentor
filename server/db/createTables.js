/**
 * createTables.js
 * ---------------
 * One-time script to create all DynamoDB tables needed by the app.
 * Run once:  node db/createTables.js
 *
 * Tables created:
 *   Users      — PK: userId | GSI: EmailIndex (email)
 *   Tests      — PK: testId | GSI: UserIdIndex (userId)
 *   Attempts   — PK: userId, SK: attemptId | GSI: TestIdIndex (testId)
 *   Questions  — PK: userId, SK: questionId
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { client } = require('./dynamodb');
const {
    CreateTableCommand,
    DescribeTableCommand,
    waitUntilTableExists,
} = require('@aws-sdk/client-dynamodb');

const tableDefs = [
    {
        TableName: 'Users',
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'email', AttributeType: 'S' },
        ],
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'EmailIndex',
                KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                BillingMode: 'PAY_PER_REQUEST',
            },
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: 'Tests',
        AttributeDefinitions: [
            { AttributeName: 'testId', AttributeType: 'S' },
            { AttributeName: 'userId', AttributeType: 'S' },
        ],
        KeySchema: [{ AttributeName: 'testId', KeyType: 'HASH' }],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'UserIdIndex',
                KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                BillingMode: 'PAY_PER_REQUEST',
            },
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: 'Attempts',
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'attemptId', AttributeType: 'S' },
            { AttributeName: 'testId', AttributeType: 'S' },
        ],
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'attemptId', KeyType: 'RANGE' },
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: 'TestIdIndex',
                KeySchema: [{ AttributeName: 'testId', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
                BillingMode: 'PAY_PER_REQUEST',
            },
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
    {
        TableName: 'Questions',
        AttributeDefinitions: [
            { AttributeName: 'userId', AttributeType: 'S' },
            { AttributeName: 'questionId', AttributeType: 'S' },
        ],
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'questionId', KeyType: 'RANGE' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
    },
];

async function tableExists(tableName) {
    try {
        await client.send(new DescribeTableCommand({ TableName: tableName }));
        return true;
    } catch (err) {
        if (err.name === 'ResourceNotFoundException') return false;
        throw err;
    }
}

async function main() {
    for (const def of tableDefs) {
        const name = def.TableName;
        if (await tableExists(name)) {
            console.log(`⏭  Table already exists: ${name}`);
            continue;
        }
        console.log(`🔨 Creating table: ${name} ...`);
        await client.send(new CreateTableCommand(def));
        await waitUntilTableExists({ client, maxWaitTime: 60 }, { TableName: name });
        console.log(`✅ Created: ${name}`);
    }
    console.log('\n🎉 All tables ready!');
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ createTables error:', err.message);
    process.exit(1);
});
