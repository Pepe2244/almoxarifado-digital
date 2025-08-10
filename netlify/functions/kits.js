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
                return await getAllKits();
            case 'POST':
                return await createKit(JSON.parse(event.body));
            case 'PUT':
                return await updateKit(JSON.parse(event.body));
            case 'DELETE':
                const id = event.queryStringParameters.id;
                if (!id) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'O ID do kit é obrigatório para exclusão.' }) };
                }
                return await deleteKit(id);
            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
        }
    } catch (error) {
        console.error('Erro na função kits:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao processar a requisição de kits.', details: error.message })
        };
    }
};

async function getAllKits() {
    const client = await pool.connect();
    try {
        const query = `
      SELECT
        k.id,
        k.name,
        k.description,
        (SELECT json_agg(json_build_object('itemId', i.id, 'itemName', i.name, 'quantity', ki.quantity))
         FROM kit_items ki
         JOIN items i ON ki."itemId" = i.id
         WHERE ki."kitId" = k.id) as items
      FROM kits k
      ORDER BY k.name ASC;
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

async function createKit(kit) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const kitQuery = `INSERT INTO kits(name, description) VALUES($1, $2) RETURNING *;`;
        const kitResult = await client.query(kitQuery, [kit.name, kit.description]);
        const newKit = kitResult.rows[0];

        if (kit.items && kit.items.length > 0) {
            for (const item of kit.items) {
                const itemQuery = `INSERT INTO kit_items("kitId", "itemId", quantity) VALUES ($1, $2, $3);`;
                await client.query(itemQuery, [newKit.id, item.itemId, item.quantity]);
            }
        }

        await client.query('COMMIT');
        return {
            statusCode: 201,
            body: JSON.stringify(newKit)
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

async function updateKit(kit) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const kitQuery = `UPDATE kits SET name = $1, description = $2 WHERE id = $3 RETURNING *;`;
        const kitResult = await client.query(kitQuery, [kit.name, kit.description, kit.id]);

        if (kitResult.rowCount === 0) throw new Error(`Kit com ID ${kit.id} não encontrado.`);

        await client.query('DELETE FROM kit_items WHERE "kitId" = $1', [kit.id]);

        if (kit.items && kit.items.length > 0) {
            for (const item of kit.items) {
                const itemQuery = `INSERT INTO kit_items("kitId", "itemId", quantity) VALUES ($1, $2, $3);`;
                await client.query(itemQuery, [kit.id, item.itemId, item.quantity]);
            }
        }

        await client.query('COMMIT');
        return {
            statusCode: 200,
            body: JSON.stringify(kitResult.rows[0])
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

async function deleteKit(id) {
    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM kits WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: `Kit com ID ${id} não encontrado.` }) };
        }
        return { statusCode: 204 };
    } finally {
        client.release();
    }
}
