const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event) => {
    try {
        switch (event.httpMethod) {
            case 'GET':
                return await getAllServiceOrders();
            case 'POST':
                return await createServiceOrder(JSON.parse(event.body));
            case 'PUT':
                return await updateServiceOrder(JSON.parse(event.body));
            case 'DELETE':
                const id = event.queryStringParameters.id;
                if (!id) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'O ID da O.S. é obrigatório para exclusão.' }) };
                }
                return await deleteServiceOrder(id);
            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
        }
    } catch (error) {
        console.error('Erro na função service-orders:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao processar a requisição de O.S.', details: error.message })
        };
    }
};

async function getAllServiceOrders() {
    const client = await pool.connect();
    try {
        const query = `
      SELECT
        so.id,
        so.customer,
        so.description,
        so.status,
        so."openDate",
        so."closeDate",
        c.name as "technicianName",
        (SELECT json_agg(json_build_object('itemName', i.name, 'quantity', soi.quantity))
         FROM service_order_items soi
         JOIN items i ON soi."itemId" = i.id
         WHERE soi."serviceOrderId" = so.id) as items
      FROM service_orders so
      LEFT JOIN collaborators c ON so."technicianId" = c.id
      ORDER BY so."createdAt" DESC;
    `;
        const result = await client.query(query);
        return {
            statusCode: 200,
            body: JSON.stringify(result.rows)
        };
    } finally {
        client.release();
    }
}

async function createServiceOrder(os) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Inicia uma transação

        const osQuery = `
      INSERT INTO service_orders(customer, "technicianId", description, status, "openDate", "closeDate")
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
        const osValues = [os.customer, os.technicianId, os.description, os.status, os.openDate, os.closeDate];
        const osResult = await client.query(osQuery, osValues);
        const newOS = osResult.rows[0];

        if (os.items && os.items.length > 0) {
            for (const item of os.items) {
                const itemQuery = `
          INSERT INTO service_order_items("serviceOrderId", "itemId", quantity, "unitPrice")
          VALUES ($1, $2, $3, $4);
        `;
                await client.query(itemQuery, [newOS.id, item.itemId, item.quantity, item.unitPrice]);
            }
        }

        await client.query('COMMIT'); // Confirma a transação
        return {
            statusCode: 201,
            body: JSON.stringify(newOS)
        };
    } catch (e) {
        await client.query('ROLLBACK'); // Desfaz a transação em caso de erro
        throw e;
    } finally {
        client.release();
    }
}

async function updateServiceOrder(os) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const osQuery = `
      UPDATE service_orders
      SET customer = $1, "technicianId" = $2, description = $3, status = $4, "openDate" = $5, "closeDate" = $6
      WHERE id = $7
      RETURNING *;
    `;
        const osValues = [os.customer, os.technicianId, os.description, os.status, os.openDate, os.closeDate, os.id];
        const osResult = await client.query(osQuery, osValues);

        if (osResult.rowCount === 0) {
            throw new Error(`O.S. com ID ${os.id} não encontrada.`);
        }

        await client.query('DELETE FROM service_order_items WHERE "serviceOrderId" = $1', [os.id]);

        if (os.items && os.items.length > 0) {
            for (const item of os.items) {
                const itemQuery = `
          INSERT INTO service_order_items("serviceOrderId", "itemId", quantity, "unitPrice")
          VALUES ($1, $2, $3, $4);
        `;
                await client.query(itemQuery, [os.id, item.itemId, item.quantity, item.unitPrice]);
            }
        }

        await client.query('COMMIT');
        return {
            statusCode: 200,
            body: JSON.stringify(osResult.rows[0])
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

async function deleteServiceOrder(id) {
    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM service_orders WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: `O.S. com ID ${id} não encontrada.` }) };
        }
        return { statusCode: 204 };
    } finally {
        client.release();
    }
}
