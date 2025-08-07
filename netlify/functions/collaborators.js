const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    const pathParts = event.path.split('/').filter(Boolean);
    const resourceId = pathParts.length > 3 ? pathParts[3] : null;

    try {
        switch (event.httpMethod) {
            case 'GET':
                if (resourceId) {
                    return await getCollaboratorById(resourceId);
                } else {
                    return await getAllCollaborators();
                }
            case 'POST':
                return await createCollaborator(JSON.parse(event.body));
            case 'PUT':
                if (resourceId) {
                    return await updateCollaborator(resourceId, JSON.parse(event.body));
                } else {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Collaborator ID is required for update' }) };
                }
            case 'DELETE':
                if (resourceId) {
                    return await deleteCollaborator(resourceId);
                } else {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Collaborator ID is required for deletion' }) };
                }
            default:
                return {
                    statusCode: 405,
                    body: JSON.stringify({ error: 'Method Not Allowed' })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};

async function getAllCollaborators() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT id, name, role, access_key as "accessKey", status, created_at as "createdAt", updated_at as "updatedAt" FROM collaborators ORDER BY name ASC');
        return {
            statusCode: 200,
            body: JSON.stringify(result.rows)
        };
    } finally {
        client.release();
    }
}

async function getCollaboratorById(id) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT id, name, role, access_key as "accessKey", status, created_at as "createdAt", updated_at as "updatedAt" FROM collaborators WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Collaborator not found' }) };
        }
        return {
            statusCode: 200,
            body: JSON.stringify(result.rows[0])
        };
    } finally {
        client.release();
    }
}

async function createCollaborator(details) {
    const client = await pool.connect();
    try {
        // CORREÇÃO: Usando snake_case para as colunas do banco
        const query = 'INSERT INTO collaborators (name, role, access_key, status) VALUES ($1, $2, $3, $4) RETURNING id, name, role, access_key as "accessKey", status;';
        const values = [details.name, details.role, details.accessKey, details.status || 'ativo'];
        const result = await client.query(query, values);
        return {
            statusCode: 201,
            body: JSON.stringify(result.rows[0])
        };
    } finally {
        client.release();
    }
}

async function updateCollaborator(id, details) {
    const client = await pool.connect();
    try {
        // CORREÇÃO: Usando snake_case para as colunas do banco
        const query = 'UPDATE collaborators SET name = $1, role = $2, access_key = $3, status = $4, updated_at = NOW() WHERE id = $5 RETURNING id, name, role, access_key as "accessKey", status;';
        const values = [details.name, details.role, details.accessKey, details.status, id];
        const result = await client.query(query, values);
        if (result.rows.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Collaborator not found' }) };
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
        const result = await client.query('DELETE FROM collaborators WHERE id = $1 RETURNING *;', [id]);
        if (result.rowCount === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Collaborator not found' }) };
        }
        return {
            statusCode: 204,
            body: ''
        };
    } finally {
        client.release();
    }
}