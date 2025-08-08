const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    const pathParts = event.path.split('/').filter(part => part);
    const kitId = pathParts[2];
    const subResource = pathParts[3];
    const componentId = pathParts[4];

    if (!kitId || subResource !== 'components') {
        return { statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) };
    }

    try {
        switch (event.httpMethod) {
            case 'GET':
                return await getKitComponents(kitId);
            case 'POST':
                return await addComponentToKit(kitId, JSON.parse(event.body));
            case 'DELETE':
                if (componentId) {
                    return await removeComponentFromKit(kitId, componentId);
                }
                return { statusCode: 400, body: JSON.stringify({ error: 'Component ID is required' }) };
            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
    }
};

async function getKitComponents(kitId) {
    const client = await pool.connect();
    try {
        const query = `
      SELECT kc.component_id as "componentId", kc.quantity, i.name as "componentName"
      FROM kit_components kc
      JOIN items i ON kc.component_id = i.id
      WHERE kc.kit_id = $1
      ORDER BY i.name;
    `;
        const result = await client.query(query, [kitId]);
        return { statusCode: 200, body: JSON.stringify(result.rows) };
    } finally {
        client.release();
    }
}

async function addComponentToKit(kitId, { componentId, quantity }) {
    const client = await pool.connect();
    try {
        const query = `
      INSERT INTO kit_components (kit_id, component_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (kit_id, component_id) DO UPDATE SET quantity = kit_components.quantity + $3
      RETURNING *;
    `;
        const values = [kitId, componentId, quantity];
        const result = await client.query(query, values);
        return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
    } finally {
        client.release();
    }
}

async function removeComponentFromKit(kitId, componentId) {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM kit_components WHERE kit_id = $1 AND component_id = $2', [kitId, componentId]);
        return { statusCode: 204, body: '' };
    } finally {
        client.release();
    }
}
