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
          return await getItemById(resourceId);
        } else {
          return await getAllItems();
        }
      case 'POST':
        return await createItem(JSON.parse(event.body));
      case 'PUT':
        if (resourceId) {
          return await updateItem(resourceId, JSON.parse(event.body));
        } else {
          return { statusCode: 400, body: JSON.stringify({ error: 'Item ID is required for update' }) };
        }
      case 'DELETE':
        if (resourceId) {
          return await deleteItem(resourceId);
        } else {
          return { statusCode: 400, body: JSON.stringify({ error: 'Item ID is required for deletion' }) };
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

async function getAllItems() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, name, barcode, type, unit, current_stock as "currentStock", min_stock as "minStock", max_stock as "maxStock", price, shelf_life_days as "shelfLifeDays", location, status, created_at as "createdAt", updated_at as "updatedAt" FROM items ORDER BY name ASC');
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows)
    };
  } finally {
    client.release();
  }
}

async function getItemById(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, name, barcode, type, unit, current_stock as "currentStock", min_stock as "minStock", max_stock as "maxStock", price, shelf_life_days as "shelfLifeDays", location, status, created_at as "createdAt", updated_at as "updatedAt" FROM items WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Item not found' }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows[0])
    };
  } finally {
    client.release();
  }
}

async function createItem(itemDetails) {
  const client = await pool.connect();
  try {
    // CORREÇÃO: Usando snake_case para as colunas do banco
    const query = `
      INSERT INTO items (name, barcode, type, unit, current_stock, min_stock, max_stock, price, shelf_life_days, location, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, name, barcode, type, unit, current_stock as "currentStock", min_stock as "minStock", max_stock as "maxStock", price, shelf_life_days as "shelfLifeDays", location, status, created_at as "createdAt", updated_at as "updatedAt";
    `;
    const values = [
      itemDetails.name,
      itemDetails.barcode,
      itemDetails.type,
      itemDetails.unit,
      itemDetails.currentStock,
      itemDetails.minStock,
      itemDetails.maxStock,
      itemDetails.price,
      itemDetails.shelfLifeDays,
      itemDetails.location,
      itemDetails.status || 'disponível'
    ];
    const result = await client.query(query, values);
    return {
      statusCode: 201,
      body: JSON.stringify(result.rows[0])
    };
  } finally {
    client.release();
  }
}

async function updateItem(id, itemDetails) {
  const client = await pool.connect();
  try {
    // CORREÇÃO: Usando snake_case para as colunas do banco
    const query = `
      UPDATE items
      SET name = $1, barcode = $2, type = $3, unit = $4, min_stock = $5, max_stock = $6, price = $7, shelf_life_days = $8, location = $9, status = $10, updated_at = NOW()
      WHERE id = $11
      RETURNING id, name, barcode, type, unit, current_stock as "currentStock", min_stock as "minStock", max_stock as "maxStock", price, shelf_life_days as "shelfLifeDays", location, status, created_at as "createdAt", updated_at as "updatedAt";
    `;
    const values = [
      itemDetails.name,
      itemDetails.barcode,
      itemDetails.type,
      itemDetails.unit,
      itemDetails.minStock,
      itemDetails.maxStock,
      itemDetails.price,
      itemDetails.shelfLifeDays,
      itemDetails.location,
      itemDetails.status,
      id
    ];
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Item not found' }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows[0])
    };
  } finally {
    client.release();
  }
}

async function deleteItem(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('DELETE FROM items WHERE id = $1 RETURNING *;', [id]);
    if (result.rowCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Item not found' }) };
    }
    return {
      statusCode: 204,
      body: ''
    };
  } finally {
    client.release();
  }
}