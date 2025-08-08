const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event, context) => {
  const pathParts = event.path.split('/').filter(part => part);
  const resourceId = pathParts[2];

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
        }
        return { statusCode: 400, body: JSON.stringify({ error: 'Item ID is required for update' }) };
      case 'DELETE':
        if (resourceId) {
          return await deleteItem(resourceId);
        }
        return { statusCode: 400, body: JSON.stringify({ error: 'Item ID is required for deletion' }) };
      default:
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
  }
};

async function getAllItems() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM items ORDER BY name ASC');
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
    const result = await client.query('SELECT * FROM items WHERE id = $1', [id]);
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
    const query = `
      INSERT INTO items (name, barcode, type, unit, "minStock", "maxStock", price, "shelfLifeDays", location, status, "currentStock")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
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
      itemDetails.currentStock
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
    const query = `
      UPDATE items
      SET name = $1, barcode = $2, type = $3, unit = $4, "minStock" = $5, "maxStock" = $6, price = $7, "shelfLifeDays" = $8, location = $9, status = $10, "updatedAt" = NOW()
      WHERE id = $11
      RETURNING *;
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
