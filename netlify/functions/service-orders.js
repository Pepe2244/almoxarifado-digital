const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    const pathParts = event.path.split('/').filter(part => part);
    const resource = pathParts[1];
    const resourceId = pathParts[2];
    const subResource = pathParts[3];
    const subResourceId = pathParts[4];

    if (resource !== 'service-orders') {
        return { statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) };
    }

    try {
        switch (event.httpMethod) {
            case 'GET':
                if (resourceId) {
                    return await getServiceOrderById(resourceId);
                } else {
                    return await getAllServiceOrders();
                }
            case 'POST':
                if (subResource === 'items') {
                    return await addItemToOrder(resourceId, JSON.parse(event.body));
                }
                return await createServiceOrder(JSON.parse(event.body));
            case 'PUT':
                return await updateServiceOrder(resourceId, JSON.parse(event.body));
            case 'DELETE':
                if (subResource === 'items' && subResourceId) {
                    return await removeItemFromOrder(resourceId, subResourceId);
                }
                return await deleteServiceOrder(resourceId);
            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
        }
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
    }
};

async function getAllServiceOrders() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
      SELECT os.*, c.name as "technicianName"
      FROM service_orders os
      LEFT JOIN collaborators c ON os.technicianId = c.id
      ORDER BY os."createdAt" DESC
    `);
        return { statusCode: 200, body: JSON.stringify(result.rows) };
    } finally {
        client.release();
    }
}

async function getServiceOrderById(id) {
    const client = await pool.connect();
    try {
        const orderResult = await client.query(`
        SELECT os.*, c.name as "technicianName"
        FROM service_orders os
        LEFT JOIN collaborators c ON os.technicianId = c.id
        WHERE os.id = $1
      `, [id]);

        if (orderResult.rows.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Service Order not found' }) };
        }

        const itemsResult = await client.query(`
        SELECT soi.*, i.name as "itemName", i.type as "itemType"
        FROM service_order_items soi
        JOIN items i ON soi.itemId = i.id
        WHERE soi.serviceOrderId = $1
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
        const query = `
      INSERT INTO service_orders (customer, technicianId, description, status)
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
        const query = `
        UPDATE service_orders
        SET customer = $1, technicianId = $2, description = $3, status = $4, "updatedAt" = NOW()
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
        await client.query('DELETE FROM service_orders WHERE id = $1', [id]);
        return { statusCode: 204, body: '' };
    } finally {
        client.release();
    }
}

async function addItemToOrder(orderId, itemDetails) {
    const client = await pool.connect();
    try {
        const itemPriceResult = await client.query('SELECT price FROM items WHERE id = $1', [itemDetails.itemId]);
        if (itemPriceResult.rows.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Item not found' }) };
        }
        const unitPrice = itemPriceResult.rows[0].price;

        const query = `
        INSERT INTO service_order_items (serviceOrderId, itemId, quantity, unitPrice)
        VALUES ($1, $2, $3, $4) RETURNING *;
      `;
        const values = [orderId, itemDetails.itemId, itemDetails.quantity, unitPrice];
        const result = await client.query(query, values);
        return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
    } finally {
        client.release();
    }
}

async function removeItemFromOrder(orderId, itemId) {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM service_order_items WHERE serviceOrderId = $1 AND itemId = $2', [orderId, itemId]);
        return { statusCode: 204, body: '' };
    } finally {
        client.release();
    }
}
