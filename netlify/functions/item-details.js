const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    const pathParts = event.path.split('/').filter(part => part);
    const itemId = pathParts[2];
    const resource = pathParts[3];

    if (!itemId || !resource) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) };
    }

    try {
        switch (resource) {
            case 'batches':
                if (event.httpMethod === 'GET') {
                    return await getBatches(itemId);
                }
                if (event.httpMethod === 'POST') {
                    return await addBatch(itemId, JSON.parse(event.body));
                }
                break;
            case 'history':
                if (event.httpMethod === 'GET') {
                    return await getHistory(itemId);
                }
                break;
        }

        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
    }
};

async function getBatches(itemId) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM item_batches WHERE item_id = $1 ORDER BY acquisition_date DESC', [itemId]);
        return { statusCode: 200, body: JSON.stringify(result.rows) };
    } finally {
        client.release();
    }
}

async function getHistory(itemId) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM item_history WHERE item_id = $1 ORDER BY created_at DESC', [itemId]);
        return { statusCode: 200, body: JSON.stringify(result.rows) };
    } finally {
        client.release();
    }
}

async function addBatch(itemId, batchDetails) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const batchQuery = `
        INSERT INTO item_batches (item_id, quantity, acquisition_date, manufacturing_date, shelf_life_days)
        VALUES ($1, $2, $3, $4, $5) RETURNING *;
      `;
        const batchValues = [itemId, batchDetails.quantity, batchDetails.acquisitionDate, batchDetails.manufacturingDate, batchDetails.shelfLifeDays];
        await client.query(batchQuery, batchValues);

        const updateStockQuery = 'UPDATE items SET "currentStock" = "currentStock" + $1 WHERE id = $2;';
        await client.query(updateStockQuery, [batchDetails.quantity, itemId]);

        const historyQuery = `
        INSERT INTO item_history (item_id, type, quantity_change, details, responsible)
        VALUES ($1, 'ENTRADA', $2, $3, $4);
      `;
        const historyDetails = `Lote adicionado. Quantidade: ${batchDetails.quantity}. Data Aquisição: ${batchDetails.acquisitionDate}.`;
        await client.query(historyQuery, [itemId, batchDetails.quantity, historyDetails, 'Sistema']);

        await client.query('COMMIT');

        return { statusCode: 201, body: JSON.stringify({ message: 'Batch added successfully' }) };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
