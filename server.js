const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// Habilita o JSON para a API
app.use(express.json());

// --- Configuração do Banco de Dados PostgreSQL ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- Criação das Tabelas ---
async function setupDatabase() {
  const client = await pool.connect();
  try {
    // Tabela de Mensagens (Chat)
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        channel TEXT NOT NULL,
        "user" TEXT NOT NULL, 
        message TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Tabela de Posts (Feed)
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        "user" TEXT NOT NULL,
        text TEXT NOT NULL,
        likes INT DEFAULT 0,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // NOVA Tabela de Perfis (da Bio)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        "user" TEXT PRIMARY KEY,
        bio TEXT
      )
    `);
    
    console.log('Tabelas "messages", "posts" e "profiles" verificadas/criadas.');

  } catch (err) { // <-- AQUI ESTAVA SEU ERRO (faltava parênteses)
    console.error('Erro ao criar tabelas:', err);
  } finally {
    client.release();
  }
}

// ===================================================
// ROTAS DO SERVIDOR (A PARTE MAIS IMPORTANTE)
// ===================================================

// --- Rota Principal (O HTML) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'orkcord.html')); 
});

// --- API (Parte "Feed") ---

// [GET] Rota para LER todos os posts do Feed
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM posts ORDER BY timestamp DESC LIMIT 30`
    );
    res.json({ posts: result.rows });
  } catch (err) {
    console.error('Erro ao buscar posts