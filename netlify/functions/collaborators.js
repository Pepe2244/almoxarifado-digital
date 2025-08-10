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
                return await getAllCollaborators();
            case 'POST':
                return await createCollaborator(JSON.parse(event.body));
            case 'PUT':
                return await updateCollaborator(JSON.parse(event.body));
            case 'DELETE':
                const id = event.queryStringParameters.id;
                if (!id) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'O ID do colaborador é obrigatório para exclusão.' }) };
                }
                return await deleteCollaborator(id);
            default:
                return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
        }
    } catch (error) {
        console.error('Erro na função collaborators:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao processar a requisição de colaboradores.', details: error.message })
        };
    }
};

async function getAllCollaborators() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM collaborators ORDER BY name ASC');
        return {
            statusCode: 200,
            body: JSON.stringify(result.rows)
        };
    } finally {
        client.release();
    }
}

async function createCollaborator(collaborator) {
    const client = await pool.connect();
    try {
        const query = `
      INSERT INTO collaborators(name, role, "accessKey", status)
      VALUES($1, $2, $3, $4)
      RETURNING *;
    `;
        const values = [collaborator.name, collaborator.role, collaborator.accessKey, collaborator.status];
        const result = await client.query(query, values);
        return {
            statusCode: 201,
            body: JSON.stringify(result.rows[0])
        };
    } finally {
        client.release();
    }
}

async function updateCollaborator(collaborator) {
    const client = await pool.connect();
    try {
        const query = `
      UPDATE collaborators
      SET name = $1, role = $2, "accessKey" = $3, status = $4
      WHERE id = $5
      RETURNING *;
    `;
        const values = [collaborator.name, collaborator.role, collaborator.accessKey, collaborator.status, collaborator.id];
        const result = await client.query(query, values);

        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: `Colaborador com ID ${collaborator.id} não encontrado.` }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows[0])
        };
    } finally {
        client.release();
    }
}

async function deleteCollaborator(id) {
    const client = await pool.connect();
    try {
        const result = await client.query('DELETE FROM collaborators WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: `Colaborador com ID ${id} não encontrado.` }) };
        }

        return { statusCode: 204 };
    } finally {
        client.release();
    }
}
