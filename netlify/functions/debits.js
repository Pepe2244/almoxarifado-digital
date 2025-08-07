// CÓDIGO CORRIGIDO - netlify/functions/debits.js

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    const pathParts = event.path.split('/').filter(Boolean);
    const resourceId = pathParts.length > 3 ? pathParts[3] : null;

    try {
        switch (event.httpMethod) {
            case 'GET':
                return await getAllDebits();
            case 'PUT':
                if (resourceId) {
                    return await updateDebitStatus(resourceId, JSON.parse(event.body));
                } else {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Debit ID is required for update' }) };
                }
            case 'DELETE':
                if (resourceId) {
                    return await deleteDebit(resourceId);
                } else {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Debit ID is required for deletion' }) };
                }
            default:
                return {
                    statusCode: 405,
                    body: JSON.stringify({ error: 'Method Not Allowed' })
                };
        }
    } catch (error) {
        console.error('Error in debits function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};

async function getAllDebits() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
        SELECT 
            d.id,
            d.item_name AS "itemName",
            d.quantity,
            d.unit_value AS "unitValue",
            d.total_value AS "totalValue",
            d.reason,
            d.status,
            d.created_at AS "createdAt",
            d.collaborator_id AS "collaboratorId",
            c.name AS "collaboratorName"
        FROM debits d
        LEFT JOIN collaborators c ON d.collaborator_id = c.id
        ORDER BY d.created_at DESC
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
        await client.query('UPDATE debits SET status = $1 WHERE id = $2', [status, id]);

        const updatedDebitQuery = await client.query(`
            SELECT 
                d.id,
                d.item_name AS "itemName",
                d.quantity,
                d.unit_value AS "unitValue",
                d.total_value AS "totalValue",
                d.reason,
                d.status,
                d.created_at AS "createdAt",
                d.collaborator_id AS "collaboratorId",
                c.name as "collaboratorName"
            FROM debits d
            LEFT JOIN collaborators c ON d.collaborator_id = c.id
            WHERE d.id = $1
        `, [id]);

        if (updatedDebitQuery.rows.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Debit not found after update' }) };
        }

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