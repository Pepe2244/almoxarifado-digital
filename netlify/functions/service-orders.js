// CÓDIGO CORRIGIDO - netlify/functions/service-orders.js

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    const pathParts = event.path.split('/').filter(part => part);
    const resourceId = pathParts.length > 3 ? pathParts[3] : null;
    const subResource = pathParts.length > 4 ? pathParts[4] : null;
    const subResourceId = pathParts.length > 5 ? pathParts[5] : null;

    try {
        switch (event.httpMethod) {
            case 'GET':
                if (resourceId) {
                    return await getServiceOrderById(resourceId);
                } else {
                    return await getAllServiceOrders();
                }
            case 'POST':
                if (resourceId && subResource === 'items') {
                    return await addItemToOrder(resourceId, JSON.parse(event.body));
                }
                return await createServiceOrder(JSON.parse(event.body));
            case 'PUT':
                if (resourceId) {
                    return await updateServiceOrder(resourceId, JSON.parse(event.body));
                } else {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Service Order ID is required for update' }) };
                }
            case 'DELETE':
                if (resourceId && subResource === 'items' && subResourceId) {
                    return await removeItemFromOrder(resourceId, subResourceId);
                }
                if (resourceId) {
                    return await deleteServiceOrder(resourceId);
                } else {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Service Order ID is required for deletion' }) };
                }
            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }
    } catch (error) {
        console.error('Error in service-orders function:', error); // Log aprimorado
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
    }
};


async function getAllServiceOrders() {
    const client = await pool.connect();
    try {
        // CORREÇÃO: Usando snake_case nas colunas e aliases para o JSON
        const result = await client.query(`
            SELECT 
                os.id, 
                os.customer,
                os.description,
                os.status,
                os.created_at AS "createdAt",
                os.updated_at AS "updatedAt",
                os.technician_id AS "technicianId",
                c.name as "technicianName"
            FROM service_orders os
            LEFT JOIN collaborators c ON os.technician_id = c.id
            ORDER BY os.created_at DESC
        `);
        return { statusCode: 200, body: JSON.stringify(result.rows) };
    } finally {
        client.release();
    }
}

async function getServiceOrderById(id) {
    const client = await pool.connect();
    try {
        // CORREÇÃO: Usando snake_case nas colunas e aliases para o JSON
        const orderResult = await client.query(`
            SELECT 
                os.id,
                os.customer,
                os.description,
                os.status,
                os.created_at AS "createdAt",
                os.updated_at AS "updatedAt",
                os.technician_id AS "technicianId",
                c.name as "technicianName"
            FROM service_orders os
            LEFT JOIN collaborators c ON os.technician_id = c.id
            WHERE os.id = $1
      `, [id]);

        if (orderResult.rows.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Service Order not found' }) };
        }

        // CORREÇÃO: Usando snake_case nas colunas e aliases para o JSON
        const itemsResult = await client.query(`
            SELECT 
                soi.service_order_id AS "serviceOrderId",
                soi.item_id AS "itemId",
                soi.quantity,
                soi.unit_price AS "unitPrice",
                i.name as "itemName", 
                i.type as "itemType"
            FROM service_order_items soi
            JOIN items i ON soi.item_id = i.id
            WHERE soi.service_order_id = $1
      `, [id]);

        const order = orderResult.rows[0];
        order.items = itemsResult.rows;

        return { statusCode: 200, body: JSON.stringify(order) };
    } finally {
        client.release();
    }
}

async function createServiceOrder(details) {
    const client = await pool.connect();
    try {
        // CORREÇÃO: Inserindo em colunas snake_case
        const query = `
      INSERT INTO service_orders (customer, technician_id, description, status)
      VALUES ($1, $2, $3, $4) RETURNING *;
    `;
        const values = [details.customer, details.technicianId, details.description, details.status];
        const result = await client.query(query, values);
        return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
    } finally {
        client.release();
    }
}

async function updateServiceOrder(id, details) {
    const client = await pool.connect();
    try {
        // CORREÇÃO: Atualizando colunas snake_case
        const query = `
            UPDATE service_orders
            SET customer = $1, technician_id = $2, description = $3, status = $4, updated_at = NOW()
            WHERE id = $5 RETURNING *;
        `;
        const values = [details.customer, details.technicianId, details.description, details.status, id];
        const result = await client.query(query, values);
        if (result.rows.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Service Order not found' }) };
        }
        return { statusCode: 200, body: JSON.stringify(result.rows[0]) };
    } finally {
        client.release();
    }
}

async function deleteServiceOrder(id) {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM service_order_items WHERE service_order_id = $1', [id]);
        await client.query('DELETE FROM service_orders WHERE id = $1', [id]);
        return { statusCode: 204, body: '' };
    } finally {
        client.release();
    }
}

async function addItemToOrder(orderId, itemDetails) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const itemResult = await client.query('SELECT price, "currentStock" FROM items WHERE id = $1 FOR UPDATE', [itemDetails.itemId]);
        if (itemResult.rows.length === 0) throw new Error('Item not found');
        if (itemResult.rows[0].currentStock < itemDetails.quantity) throw new Error('Insufficient stock');

        await client.query('UPDATE items SET "currentStock" = "currentStock" - $1 WHERE id = $2', [itemDetails.quantity, itemDetails.itemId]);

        const unitPrice = itemResult.rows[0].price;

        const query = `
            INSERT INTO service_order_items (service_order_id, item_id, quantity, unit_price)
            VALUES ($1, $2, $3, $4) RETURNING *;
        `;
        const values = [orderId, itemDetails.itemId, itemDetails.quantity, unitPrice];
        const result = await client.query(query, values);

        await client.query('COMMIT');
        return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
    } catch (error) {
        await client.query('ROLLBACK');
        return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    } finally {
        client.release();
    }
}

async function removeItemFromOrder(orderId, itemId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const itemResult = await client.query('SELECT quantity FROM service_order_items WHERE service_order_id = $1 AND item_id = $2', [orderId, itemId]);
        if (itemResult.rows.length > 0) {
            const quantityToReturn = itemResult.rows[0].quantity;
            await client.query('UPDATE items SET "currentStock" = "currentStock" + $1 WHERE id = $2', [quantityToReturn, itemId]);
        }

        await client.query('DELETE FROM service_order_items WHERE service_order_id = $1 AND item_id = $2', [orderId, itemId]);

        await client.query('COMMIT');
        return { statusCode: 204, body: '' };
    } catch (error) {
        await client.query('ROLLBACK');
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    } finally {
        client.release();
    }
}