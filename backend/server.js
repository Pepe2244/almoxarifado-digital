const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);


const allowedOrigins = [
    'https://almoxarifado-digital.netlify.app',
];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
};
const io = new Server(server, {
    cors: corsOptions
});
app.use(cors(corsOptions));


app.use(express.json({ limit: '25mb' }));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao adquirir cliente da pool de conexão', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Erro ao executar a query de teste', err.stack);
        }
        console.log('Conectado com sucesso à base de dados PostgreSQL (Neon)!');
    });
});

const query = (text, params) => pool.query(text, params);


async function checkAndClearExpiredReceipts() {
    try {
        const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

        const { rows } = await query(
            "SELECT token, receipt_data FROM temporary_receipts WHERE created_at < $1 AND status = 'pending'",
            [eightHoursAgo]
        );

        for (const receipt of rows) {
            const collaboratorName = receipt.receipt_data?.collaboratorName || 'Desconhecido';
            const message = `Comprovante não assinado por ${collaboratorName}.`;

            io.emit('receipt_expired_unsigned', {
                message: message,
                collaboratorName: collaboratorName
            });
            console.log(`Notificação de comprovante expirado enviada para: ${collaboratorName}`);
        }

        if (rows.length > 0) {
            const tokensToDelete = rows.map(r => r.token);
            await query("DELETE FROM temporary_receipts WHERE token = ANY($1::text[])", [tokensToDelete]);
            console.log(`${rows.length} token(s) de comprovante pendentes e expirados foram limpos.`);
        } else {
            console.log("Nenhum token de comprovante pendente e expirado para limpar.");
        }

    } catch (err) {
        console.error("Erro ao verificar e limpar tokens expirados:", err);
    }
}


setInterval(checkAndClearExpiredReceipts, 5 * 60 * 1000);


app.get('/', (req, res) => {
    res.send('API do Almoxarifado Digital está no ar!');
});

app.post('/api/generate-receipt', async (req, res) => {
    const { collaboratorId, collaboratorName, collaboratorRole, collaboratorRegistration, deliveryLocation, items, service_order_id, observations } = req.body;

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
        observations,
        deliveryDate: new Date()
    };

    try {

        const sql = 'INSERT INTO temporary_receipts (token, receipt_data, status) VALUES ($1, $2, $3)';
        await query(sql, [token, JSON.stringify(receiptData), 'pending']);
        res.status(200).json({ token });
    } catch (err) {
        console.error("Erro ao salvar token no banco de dados:", err);
        res.status(500).json({ error: 'Erro interno do servidor ao gerar o link.' });
    }
});


app.get('/api/receipt-data/:token', async (req, res) => {
    const { token } = req.params;

    try {

        const sql = "SELECT receipt_data, created_at, status FROM temporary_receipts WHERE token = $1";
        const { rows } = await query(sql, [token]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Comprovante não encontrado ou expirado. Por favor, gere um novo link.' });
        }

        const receipt = rows[0];


        if (receipt.status === 'signed') {
            return res.status(200).json({ status: 'signed', receipt_data: receipt.receipt_data });
        }

        const creationDate = new Date(receipt.created_at);

        const expirationDate = new Date(creationDate.getTime() + 8 * 60 * 60 * 1000);

        if (new Date() > expirationDate) {
            await query("DELETE FROM temporary_receipts WHERE token = $1", [token]);
            return res.status(404).json({ error: 'Este link de comprovante expirou. Por favor, gere um novo.' });
        }

        res.status(200).json({ status: 'pending', receipt_data: receipt.receipt_data });

    } catch (err) {
        console.error("Erro ao buscar token no banco de dados:", err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


app.post('/api/receipts', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            token,
            service_order_id,
            collaborator_id,
            collaborator_name,
            collaborator_role,
            delivery_location,
            items,
            proof_image,
            observations
        } = req.body;

        if (!token) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Token do comprovante não fornecido.' });
        }


        const { rows: tempRows } = await client.query('SELECT status FROM temporary_receipts WHERE token = $1 FOR UPDATE', [token]);

        if (tempRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Link de comprovante inválido ou expirado.' });
        }

        if (tempRows[0].status === 'signed') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Este comprovante já foi assinado.' });
        }


        const insertSql = `
            INSERT INTO signed_receipts
            (service_order_id, collaborator_id, collaborator_name, collaborator_role, delivery_location, items, proof_image, observations)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [service_order_id, collaborator_id, collaborator_name, collaborator_role, delivery_location, JSON.stringify(items), proof_image, observations];
        const result = await client.query(insertSql, values);
        const newReceipt = result.rows[0];


        await client.query("UPDATE temporary_receipts SET status = 'signed' WHERE token = $1", [token]);

        await client.query('COMMIT');

        io.emit('new_receipt_signed', newReceipt);
        res.status(201).json({ id: newReceipt.id, message: 'Comprovante salvo com sucesso!' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao processar comprovante:", err);
        res.status(500).json({ error: 'Erro interno do servidor ao processar o comprovante.' });
    } finally {
        client.release();
    }
});


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

app.delete('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    const sql = 'UPDATE items SET is_active = FALSE, updated_at = NOW() WHERE id = $1';
    try {
        await query(sql, [id]);
        res.sendStatus(204);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

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
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const soSql = 'INSERT INTO service_orders (collaborator_id, notes) VALUES ($1, $2) RETURNING id';
        const soResult = await client.query(soSql, [collaborator_id, notes]);
        const serviceOrderId = soResult.rows[0].id;

        const itemsSql = 'INSERT INTO service_order_items (service_order_id, item_id, quantity_requested) VALUES ($1, $2, $3)';

        for (const item of items) {
            await client.query(itemsSql, [serviceOrderId, item.id, item.quantity]);
        }

        await client.query('COMMIT');
        res.status(201).json({ id: serviceOrderId, message: 'Ordem de serviço criada com sucesso!' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
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

io.on('connection', (socket) => {
    console.log('Um usuário se conectou via WebSocket');

    socket.on('disconnect', () => {
        console.log('Usuário desconectado');
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
