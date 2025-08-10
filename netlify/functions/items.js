// Importa o 'Pool' da biblioteca 'pg', que gerencia as conexões com o banco de dados PostgreSQL.
const { Pool } = require('pg');

// Cria um novo pool de conexões. Ele usa a 'connectionString' que você configurou
// nas variáveis de ambiente do Netlify (DATABASE_URL).
// A configuração SSL é necessária para conectar com segurança ao Neon.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 'handler' é a função principal que a Netlify executa quando este endpoint é chamado.
// Ela recebe os detalhes do evento (como método HTTP, corpo da requisição, etc.).
exports.handler = async (event) => {
  // O 'try...catch' garante que qualquer erro inesperado seja capturado e retornado
  // de forma controlada, evitando que a aplicação quebre.
  try {
    // Um 'switch' para direcionar a requisição para a função correta com base no método HTTP.
    // Isso é a base de uma API RESTful.
    switch (event.httpMethod) {
      case 'GET':
        // Se a requisição for GET, busca todos os itens.
        return await getAllItems();
      case 'POST':
        // Se for POST, cria um novo item com os dados enviados no corpo da requisição.
        return await createItem(JSON.parse(event.body));
      case 'PUT':
        // Se for PUT, atualiza um item existente.
        return await updateItem(JSON.parse(event.body));
      case 'DELETE':
        // Se for DELETE, remove um item. O ID do item a ser removido
        // é passado como um parâmetro na URL (ex: /.netlify/functions/items?id=123).
        const id = event.queryStringParameters.id;
        if (!id) {
          return { statusCode: 400, body: JSON.stringify({ error: 'O ID do item é obrigatório para exclusão.' }) };
        }
        return await deleteItem(id);
      default:
        // Se o método não for um dos esperados, retorna um erro.
        return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
    }
  } catch (error) {
    // Loga o erro no console do Netlify para depuração.
    console.error('Erro na função items:', error);
    // Retorna uma resposta de erro genérica para o frontend.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Falha ao processar a requisição de itens.', details: error.message })
    };
  }
};

// --- Funções Auxiliares para cada Operação ---

// Função para buscar TODOS os itens no banco de dados.
async function getAllItems() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM items ORDER BY name ASC');
    return {
      statusCode: 200,
      // Converte o resultado do banco (que é um array de objetos) para uma string JSON.
      body: JSON.stringify(result.rows)
    };
  } finally {
    // Libera o cliente de volta para o pool, independentemente do que aconteceu.
    // Isso é crucial para não esgotar as conexões do banco.
    client.release();
  }
}

// Função para CRIAR um novo item.
async function createItem(item) {
  const client = await pool.connect();
  try {
    // Query SQL para inserir um novo registro na tabela 'items'.
    // Usamos '$1', '$2', etc., para evitar SQL Injection. Os valores são passados em um array separado.
    const query = `
      INSERT INTO items(name, barcode, type, unit, "minStock", "maxStock", price, "shelfLifeDays", location, status, "currentStock")
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *; -- 'RETURNING *' faz com que o banco retorne o item recém-criado.
    `;
    const values = [
      item.name, item.barcode, item.type, item.unit, item.minStock, item.maxStock,
      item.price, item.shelfLifeDays, item.location, item.status, item.currentStock
    ];
    const result = await client.query(query, values);
    return {
      statusCode: 201, // 201 Created: sucesso na criação de um recurso.
      body: JSON.stringify(result.rows[0])
    };
  } finally {
    client.release();
  }
}

// Função para ATUALIZAR um item existente.
async function updateItem(item) {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE items
      SET name = $1, barcode = $2, type = $3, unit = $4, "minStock" = $5, "maxStock" = $6,
          price = $7, "shelfLifeDays" = $8, location = $9, status = $10, "currentStock" = $11
      WHERE id = $12
      RETURNING *;
    `;
    const values = [
      item.name, item.barcode, item.type, item.unit, item.minStock, item.maxStock,
      item.price, item.shelfLifeDays, item.location, item.status, item.currentStock, item.id
    ];
    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: `Item com ID ${item.id} não encontrado.` }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows[0])
    };
  } finally {
    client.release();
  }
}

// Função para DELETAR um item.
async function deleteItem(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('DELETE FROM items WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: `Item com ID ${id} não encontrado.` }) };
    }

    // Para DELETE, é comum retornar uma resposta sem corpo, apenas com o status de sucesso.
    return { statusCode: 204 }; // 204 No Content
  } finally {
    client.release();
  }
}
