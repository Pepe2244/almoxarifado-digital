const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    const client = await pool.connect();
    try {
        switch (event.httpMethod) {
            case 'GET':
                const getResult = await client.query('SELECT * FROM logs ORDER BY "timestamp" DESC LIMIT 500');
                return {
                    statusCode: 200,
                    body: JSON.stringify(getResult.rows)
                };

            case 'POST':
                const { action, details, user } = JSON.parse(event.body);
                const postResult = await client.query(
                    'INSERT INTO logs (action, details, "user") VALUES ($1, $2, $3) RETURNING *',
                    [action, details, user]
                );
                return {
                    statusCode: 201,
                    body: JSON.stringify(postResult.rows[0])
                };

            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    } finally {
        client.release();
    }
};
