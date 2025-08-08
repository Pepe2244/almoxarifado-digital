const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    const pathParts = event.path.split('/').filter(part => part);
    const resourceId = pathParts[2];

    try {
        switch (event.httpMethod) {
            case 'GET':
                return await getAllDebits();
            case 'PUT':
                if (resourceId) {
                    return await updateDebitStatus(resourceId, JSON.parse(event.body));
                }
                return { statusCode: 400, body: JSON.stringify({ error: 'Debit ID is required for update' }) };
            case 'DELETE':
                if (resourceId) {
                    return await deleteDebit(resourceId);
                }
                return { statusCode: 400, body: JSON.stringify({ error: 'Debit ID is required for deletion' }) };
            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
    }
};

async function getAllDebits() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
        SELECT d.*, c.name as "collaboratorName"
        FROM debits d
        LEFT JOIN collaborators c ON d."collaboratorId" = c.id
        ORDER BY d."createdAt" DESC
    `);
        return {
            statusCode: 200,
            body: JSON.stringify(result.rows)
        };
    } finally {
        client.release();
    }
}

async function updateDebitStatus(id, { status }) {
    const client = await pool.connect();
    try {
        const query = 'UPDATE debits SET status = $1 WHERE id = $2 RETURNING *;';
        const values = [status, id];
        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Debit not found' }) };
        }

        const updatedDebitQuery = await client.query(`
        SELECT d.*, c.name as "collaboratorName"
        FROM debits d
        LEFT JOIN collaborators c ON d."collaboratorId" = c.id
        WHERE d.id = $1
    `, [id]);

        return {
            statusCode: 200,
            body: JSON.stringify(updatedDebitQuery.rows[0])
        };
    } finally {
        client.release();
    }
}

async function deleteDebit(id) {
    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM debits WHERE id = $1 RETURNING *;', [id]);
        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Debit not found' }) };
        }
        return {
            statusCode: 204,
            body: ''
        };
    } finally {
        client.release();
    }
}
