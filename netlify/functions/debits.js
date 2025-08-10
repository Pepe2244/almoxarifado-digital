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
                return await getAllDebits();
            case 'POST':
                return await createDebit(JSON.parse(event.body));
            case 'PUT':
                return await updateDebit(JSON.parse(event.body));
            case 'DELETE':
                const id = event.queryStringParameters.id;
                if (!id) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'O ID do débito é obrigatório para exclusão.' }) };
                }
                return await deleteDebit(id);
            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
        }
    } catch (error) {
        console.error('Erro na função debits:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao processar a requisição de débitos.', details: error.message })
        };
    }
};

async function getAllDebits() {
    const client = await pool.connect();
    try {
        const query = `
        SELECT d.*, c.name as "collaboratorName"
        FROM debits d
        LEFT JOIN collaborators c ON d."collaboratorId" = c.id
        ORDER BY d."createdAt" DESC
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

async function createDebit(debit) {
    const client = await pool.connect();
    try {
        const query = `
      INSERT INTO debits("collaboratorId", "itemName", quantity, "unitValue", "totalValue", reason, status)
      VALUES($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
        const values = [debit.collaboratorId, debit.itemName, debit.quantity, debit.unitValue, debit.totalValue, debit.reason, debit.status];
        const result = await client.query(query, values);
        return {
            statusCode: 201,
            body: JSON.stringify(result.rows[0])
        };
    } finally {
        client.release();
    }
}

async function updateDebit(debit) {
    const client = await pool.connect();
    try {
        const query = `
      UPDATE debits
      SET "collaboratorId" = $1, "itemName" = $2, quantity = $3, "unitValue" = $4, "totalValue" = $5, reason = $6, status = $7
      WHERE id = $8
      RETURNING *;
    `;
        const values = [debit.collaboratorId, debit.itemName, debit.quantity, debit.unitValue, debit.totalValue, debit.reason, debit.status, debit.id];
        const result = await client.query(query, values);

        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: `Débito com ID ${debit.id} não encontrado.` }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows[0])
        };
    } finally {
        client.release();
    }
}

async function deleteDebit(id) {
    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM debits WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: `Débito com ID ${id} não encontrado.` }) };
        }
        return { statusCode: 204 };
    } finally {
        client.release();
    }
}
