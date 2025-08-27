// backend/server.js

const express = require('express');
// A usar o 'pg' em vez de 'mysql2' para conectar ao PostgreSQL
const { Pool } = require('pg');
const cors = require('cors');
const crypto = require('crypto'); // Módulo nativo do Node.js para gerar o token
require('dotenv').config();

const app = express();
app.use(cors());
// Limite de payload aumentado para 25mb para acomodar o upload de fotos em base64
app.use(express.json({ limit: '25mb' }));

// Armazenamento em memória para os links de comprovante temporários
const temporaryReceipts = new Map();

// Configuração da conexão com o banco de dados PostgreSQL (Neon)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Testar a conexão
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao adquirir cliente da pool de conexão', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release(); // Liberar o cliente de volta para a pool
        if (err) {
            return console.error('Erro ao executar a query de teste', err.stack);
        }
        console.log('Conectado com sucesso à base de dados PostgreSQL (Neon)!');
    });
});

// Função auxiliar para executar queries de forma segura
const query = (text, params) => pool.query(text, params);


// Rota de teste
app.get('/', (req, res) => {
    res.send('API do Almoxarifado Digital está no ar!');
});

// ==================================================================
// == ROTAS PARA GERAR E BUSCAR COMPROVANTES (ATUALIZADAS) ==
// ==================================================================

// ROTA POST: Gerar um link único para um novo comprovante
app.post('/api/generate-receipt', (req, res) => {
    const { collaboratorId, collaboratorName, collaboratorRole, collaboratorRegistration, deliveryLocation, items, service_order_id } = req.body;

    if (!collaboratorId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Dados insuficientes para gerar o comprovante.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const receiptData = {
        collaboratorId,
        collaboratorName,
        collaboratorRole,
        collaboratorRegistration,
        deliveryLocation,
        items,
        service_order_id,
        deliveryDate: new Date()
    };

    temporaryReceipts.set(token, receiptData);

    setTimeout(() => {
        temporaryReceipts.delete(token);
        console.log(`Comprovante com token ${token} expirou e foi removido.`);
    }, 3600 * 1000); // 1 hora

    res.status(200).json({ token });
});

// ROTA GET: Obter os dados de um comprovante a partir de um token
app.get('/api/receipt-data/:token', (req, res) => {
    const { token } = req.params;
    const receiptData = temporaryReceipts.get(token);

    if (receiptData) {
        res.status(200).json(receiptData);
    } else {
        res.status(404).json({ error: 'Comprovante não encontrado ou expirado. Por favor, gere um novo link.' });
    }
});


// ==================================================================
// == ROTAS PARA ITENS (Adaptadas para PostgreSQL) ==
// ==================================================================

app.get('/api/items', async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM items WHERE is_active = TRUE ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/items', async (req, res) => {
    const { name, description, quantity, location, patrimony, serial_number } = req.body;
    const sql = 'INSERT INTO items (name, description, quantity, location, patrimony, serial_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    try {
        const { rows } = await query(sql, [name, description, quantity, location, patrimony, serial_number]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    // Extrair apenas os campos que podem ser atualizados para evitar erros
    const { name, description, quantity, location, patrimony, serial_number, is_active } = req.body;
    const sql = 'UPDATE items SET name = $1, description = $2, quantity = $3, location = $4, patrimony = $5, serial_number = $6, is_active = $7, updated_at = NOW() WHERE id = $8 RETURNING *';
    try {
        const { rows } = await query(sql, [name, description, quantity, location, patrimony, serial_number, is_active, id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Desativar um item (soft delete)
app.delete('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    const sql = 'UPDATE items SET is_active = FALSE, updated_at = NOW() WHERE id = $1';
    try {
        await query(sql, [id]);
        res.sendStatus(204); // Sem conteúdo, sucesso
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ==================================================================
// == ROTAS PARA COLABORADORES (Adaptadas para PostgreSQL) ==
// ==================================================================

app.get('/api/collaborators', async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM collaborators WHERE is_active = TRUE ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/collaborators', async (req, res) => {
    const { name, role, registration_number } = req.body;
    const sql = 'INSERT INTO collaborators (name, role, registration_number) VALUES ($1, $2, $3) RETURNING *';
    try {
        const { rows } = await query(sql, [name, role, registration_number]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/collaborators/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role, registration_number, is_active } = req.body;
    const sql = 'UPDATE collaborators SET name = $1, role = $2, registration_number = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *';
    try {
        const { rows } = await query(sql, [name, role, registration_number, is_active, id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Colaborador não encontrado' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/collaborators/:id', async (req, res) => {
    const { id } = req.params;
    const sql = 'UPDATE collaborators SET is_active = FALSE, updated_at = NOW() WHERE id = $1';
    try {
        await query(sql, [id]);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// ==================================================================
// == ROTAS PARA ORDENS DE SERVIÇO (Adaptadas para PostgreSQL) ==
// ==================================================================

app.get('/api/service-orders', async (req, res) => {
    const sql = `
        SELECT so.*, c.name as collaborator_name
        FROM service_orders so
        JOIN collaborators c ON so.collaborator_id = c.id
        ORDER BY so.created_at DESC
    `;
    try {
        const { rows } = await query(sql);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/service-orders/:id/items', async (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT i.id, i.name, i.patrimony, soi.quantity_requested
        FROM service_order_items soi
        JOIN items i ON soi.item_id = i.id
        WHERE soi.service_order_id = $1
    `;
    try {
        const { rows } = await query(sql, [id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/service-orders', async (req, res) => {
    const { collaborator_id, items, notes } = req.body;
    const client = await pool.connect(); // Obter um cliente da pool para a transação

    try {
        await client.query('BEGIN'); // Iniciar transação

        const soSql = 'INSERT INTO service_orders (collaborator_id, notes) VALUES ($1, $2) RETURNING id';
        const soResult = await client.query(soSql, [collaborator_id, notes]);
        const serviceOrderId = soResult.rows[0].id;

        // PostgreSQL é mais eficiente com um único INSERT com múltiplos valores
        const itemsSql = 'INSERT INTO service_order_items (service_order_id, item_id, quantity_requested) VALUES ($1, $2, $3)';

        // Executar um INSERT para cada item
        for (const item of items) {
            await client.query(itemsSql, [serviceOrderId, item.id, item.quantity]);
        }

        await client.query('COMMIT'); // Finalizar transação com sucesso
        res.status(201).json({ id: serviceOrderId, message: 'Ordem de serviço criada com sucesso!' });

    } catch (err) {
        await client.query('ROLLBACK'); // Desfazer transação em caso de erro
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release(); // Liberar o cliente de volta para a pool
    }
});


// ==================================================================
// == ROTAS PARA COMPROVANTES ASSINADOS (ATUALIZADAS) ==
// ==================================================================

app.post('/api/receipts', async (req, res) => {
    const {
        service_order_id,
        collaborator_id,
        collaborator_name,
        collaborator_role,
        delivery_location,
        items,
        proof_image
    } = req.body;

    // Verifica se já existe um comprovante para esta ordem de serviço
    if (service_order_id) {
        const checkSql = 'SELECT id FROM signed_receipts WHERE service_order_id = $1';
        try {
            const { rows } = await query(checkSql, [service_order_id]);
            if (rows.length > 0) {
                // Retorna um erro 409 (Conflict) se o comprovante já existir
                return res.status(409).json({ error: 'Este comprovante já foi enviado.' });
            }
        } catch (err) {
            console.error("Erro ao verificar o comprovante existente:", err);
            return res.status(500).json({ error: 'Erro interno do servidor ao verificar o comprovante.' });
        }
    }

    const sql = `
        INSERT INTO signed_receipts
        (service_order_id, collaborator_id, collaborator_name, collaborator_role, delivery_location, items, proof_image)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `;
    const values = [service_order_id, collaborator_id, collaborator_name, collaborator_role, delivery_location, JSON.stringify(items), proof_image];

    try {
        const result = await query(sql, values);
        res.status(201).json({ id: result.rows[0].id, message: 'Comprovante salvo com sucesso!' });
    } catch (err) {
        console.error("Erro ao salvar comprovante:", err);
        res.status(500).json({ error: 'Erro interno do servidor ao salvar o comprovante.' });
    }
});


app.get('/api/receipts', async (req, res) => {
    const sql = 'SELECT * FROM signed_receipts ORDER BY created_at DESC';
    try {
        const { rows } = await query(sql);
        res.json(rows);
    } catch (err) {
        console.error("Erro ao buscar comprovantes:", err);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar os comprovantes.' });
    }
});


// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});