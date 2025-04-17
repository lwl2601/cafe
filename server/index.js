require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {Pool} = require('pg');

const app = express();
const port = process.env.PORT || 5000;

// Configuração do CORS
app.use(cors());
app.use(express.json());

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Criar tabela se não existir
pool
  .query(
    `
  CREATE TABLE IF NOT EXISTS contributors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    item VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS lists (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    current BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(type, name)
  );
`,
  )
  .catch(err => console.error('Erro ao criar tabelas:', err));

// Rota GET /api/contributors
app.get('/api/contributors', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contributors ORDER BY date DESC',
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar contributors:', err);
    res.status(500).json({error: 'Erro interno do servidor'});
  }
});

// Rota POST /api/contributors
app.post('/api/contributors', async (req, res) => {
  const {name, date, item, quantity} = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO contributors (name, date, item, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, date, item, quantity],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar contributor:', err);
    res.status(500).json({error: 'Erro interno do servidor'});
  }
});

// Rota DELETE /api/contributors/:id
app.delete('/api/contributors/:id', async (req, res) => {
  const {id} = req.params;
  try {
    await pool.query('DELETE FROM contributors WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar contributor:', err);
    res.status(500).json({error: 'Erro interno do servidor'});
  }
});

// Rota GET /api/lists
app.get('/api/lists', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lists ORDER BY type, name');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar lists:', err);
    res.status(500).json({error: 'Erro interno do servidor'});
  }
});

// Rota POST /api/lists
app.post('/api/lists', async (req, res) => {
  const {type, name, current} = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO lists (type, name, current) VALUES ($1, $2, $3) ON CONFLICT (type, name) DO UPDATE SET current = $3 RETURNING *',
      [type, name, current],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar/atualizar list:', err);
    res.status(500).json({error: 'Erro interno do servidor'});
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
