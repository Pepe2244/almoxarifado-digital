const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { type, payload } = JSON.parse(event.body);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let result;
        switch (type) {
            case 'LOAN':
                result = await handleLoan(client, payload);
                break;
            case 'RETURN':
                result = await handleReturn(client, payload);
                break;
            case 'ADJUSTMENT':
                result = await handleAdjustment(client, payload);
                break;
            case 'DIRECT_LOSS':
                result = await handleDirectLoss(client, payload);
                break;
            default:
                throw new Error('Invalid movement type');
        }

        await client.query('COMMIT');
        return { statusCode: 200, body: JSON.stringify(result) };

    } catch (error) {
        await client.query('ROLLBACK');
        return { statusCode: 500, body: JSON.stringify({ error: 'Transaction failed', details: error.message }) };
    } finally {
        client.release();
    }
};

async function handleLoan(client, { itemId, collaboratorId, quantity, location }) {
    const itemResult = await client.query('SELECT "currentStock", name FROM items WHERE id = $1 FOR UPDATE', [itemId]);
    if (itemResult.rows.length === 0) throw new Error('Item not found');
    if (itemResult.rows[0].currentStock < quantity) throw new Error('Insufficient stock');

    await client.query('UPDATE items SET "currentStock" = "currentStock" - $1 WHERE id = $2', [quantity, itemId]);

    const collaboratorResult = await client.query('SELECT name FROM collaborators WHERE id = $1', [collaboratorId]);
    const collaboratorName = collaboratorResult.rows.length > 0 ? collaboratorResult.rows[0].name : 'Desconhecido';

    const details = `Saída para ${collaboratorName}. Local: ${location || 'N/A'}.`;
    await client.query(
        'INSERT INTO item_history (item_id, type, quantity_change, details, responsible) VALUES ($1, $2, $3, $4, $5)',
        [itemId, 'SAÍDA', -quantity, details, collaboratorName]
    );

    return { message: 'Loan registered successfully' };
}

async function handleReturn(client, { itemId, quantity, responsible }) {
    await client.query('UPDATE items SET "currentStock" = "currentStock" + $1 WHERE id = $2', [quantity, itemId]);

    const details = `Devolução de item ao estoque.`;
    await client.query(
        'INSERT INTO item_history (item_id, type, quantity_change, details, responsible) VALUES ($1, $2, $3, $4, $5)',
        [itemId, 'DEVOLUÇÃO', quantity, details, responsible]
    );

    return { message: 'Return registered successfully' };
}

async function handleAdjustment(client, { itemId, newCount, responsible }) {
    const itemResult = await client.query('SELECT "currentStock", name FROM items WHERE id = $1 FOR UPDATE', [itemId]);
    if (itemResult.rows.length === 0) throw new Error('Item not found');

    const oldStock = itemResult.rows[0].currentStock;
    const quantityChange = newCount - oldStock;

    await client.query('UPDATE items SET "currentStock" = $1 WHERE id = $2', [newCount, itemId]);

    const details = `Ajuste de ${oldStock} para ${newCount}.`;
    await client.query(
        'INSERT INTO item_history (item_id, type, quantity_change, details, responsible) VALUES ($1, $2, $3, $4, $5)',
        [itemId, 'AJUSTE', quantityChange, details, responsible]
    );

    return { message: 'Stock adjusted successfully' };
}

async function handleDirectLoss(client, { itemId, quantity, reason, responsible, collaboratorId }) {
    const itemResult = await client.query('SELECT "currentStock", name, price FROM items WHERE id = $1 FOR UPDATE', [itemId]);
    if (itemResult.rows.length === 0) throw new Error('Item not found');
    if (itemResult.rows[0].currentStock < quantity) throw new Error('Insufficient stock for loss');

    await client.query('UPDATE items SET "currentStock" = "currentStock" - $1 WHERE id = $2', [quantity, itemId]);

    const details = `Perda direta do estoque. Motivo: ${reason}.`;
    await client.query(
        'INSERT INTO item_history (item_id, type, quantity_change, details, responsible) VALUES ($1, $2, $3, $4, $5)',
        [itemId, 'PERDA', -quantity, details, responsible]
    );

    if (collaboratorId) {
        const totalValue = itemResult.rows[0].price * quantity;
        await client.query(
            'INSERT INTO debits ("collaboratorId", "itemName", quantity, "unitValue", "totalValue", reason) VALUES ($1, $2, $3, $4, $5, $6)',
            [collaboratorId, itemResult.rows[0].name, quantity, itemResult.rows[0].price, totalValue, `Perda direta: ${reason}`]
        );
    }

    return { message: 'Loss registered successfully' };
}
