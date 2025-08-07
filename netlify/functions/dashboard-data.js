// CÓDIGO CORRIGIDO - netlify/functions/dashboard-data.js

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const client = await pool.connect();
    try {
        const itemStatsQuery = `
      SELECT
        COUNT(*) AS "totalItems",
        SUM(price * current_stock) AS "totalStockValue",
        SUM(current_stock) AS "totalStockQuantity"
      FROM items;
    `;

        const collaboratorStatsQuery = `SELECT COUNT(*) AS "totalCollaborators" FROM collaborators WHERE status = 'ativo';`;

        const debitStatsQuery = `
      SELECT
        COUNT(*) AS "pendingDebitsCount",
        SUM(total_value) AS "pendingDebitsValue"
      FROM debits
      WHERE status = 'pendente';
    `;

        const serviceOrderStatsQuery = `SELECT COUNT(*) AS "openServiceOrders" FROM service_orders WHERE status != 'Fechada';`;

        const itemTypesQuery = `
        SELECT type, COUNT(*) as count
        FROM items
        GROUP BY type
        ORDER BY count DESC;
    `;

        const [
            itemStatsResult,
            collaboratorStatsResult,
            debitStatsResult,
            serviceOrderStatsResult,
            itemTypesResult
        ] = await Promise.all([
            client.query(itemStatsQuery),
            client.query(collaboratorStatsQuery),
            client.query(debitStatsQuery),
            client.query(serviceOrderStatsQuery),
            client.query(itemTypesQuery)
        ]);

        const dashboardData = {
            totalItems: parseInt(itemStatsResult.rows[0].totalItems, 10) || 0,
            totalStockValue: parseFloat(itemStatsResult.rows[0].totalStockValue) || 0,
            totalStockQuantity: parseInt(itemStatsResult.rows[0].totalStockQuantity, 10) || 0,
            totalCollaborators: parseInt(collaboratorStatsResult.rows[0].totalCollaborators, 10) || 0,
            pendingDebitsCount: parseInt(debitStatsResult.rows[0].pendingDebitsCount, 10) || 0,
            pendingDebitsValue: parseFloat(debitStatsResult.rows[0].pendingDebitsValue) || 0,
            openServiceOrders: parseInt(serviceOrderStatsResult.rows[0].openServiceOrders, 10) || 0,
            itemTypesDistribution: itemTypesResult.rows
        };

        return {
            statusCode: 200,
            body: JSON.stringify(dashboardData)
        };
    } catch (error) {
        console.error('Error in dashboard-data function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    } finally {
        client.release();
    }
};