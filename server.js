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
    console.log('Tabelas "messages" e "posts" verificadas/criadas com sucesso.');
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  } finally {
    client.release();
  }
}

// ===================================================
// ROTAS DO SERVIDOR (A PARTE MAIS IMPORTANTE)
// ===================================================

// --- Rota Principal (O HTML) ---
// ESSA É A LINHA QUE CORRIGE O "CANNOT GET /"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'orkcord.html')); 
});

// --- API (Parte "Orkut") ---

// [GET] Rota para LER todos os posts do Feed
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM posts ORDER BY timestamp DESC LIMIT 30`
    );
    res.json({ posts: result.rows });
  } catch (err) {
    console.error('Erro ao buscar posts:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// [POST] Rota para CRIAR um novo post no Feed
app.post('/api/posts', async (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) {
    return res.status(400).json({ error: 'Usuário e texto são obrigatórios' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO posts ("user", text, timestamp) VALUES ($1, $2, NOW()) RETURNING *`,
      [user, text]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar post:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- Lógica do Socket.IO (Parte "Discord") ---
io.on('connection', (socket) => {
  console.log(`Um utilizador conectou-se: ${socket.id}`);

  // 1. OUVIR QUANDO O UTILIZADOR MUDA DE CANAL (CORRIGIDO)
  socket.on('joinChannel', async (data) => {
    // CORREÇÃO: Pega o nome do canal (string) de dentro do objeto (data)
    const channelName = (typeof data === 'object' && data.channel) ? data.channel : data;

    if (!channelName || typeof channelName !== 'string') {
      console.error('Erro: Tentativa de entrar em canal inválido.', data);
      return;
    }
    try {
      console.log(`Utilizador ${socket.id} entrou no canal ${channelName}`);
      socket.join(channelName); 
      
      const result = await pool.query(
        `SELECT * FROM messages WHERE channel = $1 ORDER BY timestamp ASC LIMIT 50`, 
        [channelName]
      );
      const history = result.rows.map(row => ({
        ...row,
        user: row.user,
        timestamp: new Date(row.timestamp).toLocaleString('pt-BR')
      }));
      socket.emit('loadHistory', history);
    } catch (err) {
      console.error('Erro em joinChannel:', err);
    }
  });

  // 2. OUVIR QUANDO O UTILIZADOR ENVIA UMA MENSAGEM (RESTaurado)
  socket.on('sendMessage', async (data) => {
    const { channel, user, message } = data;
    const timestamp = new Date();
    try {
      await pool.query(
        `INSERT INTO messages (channel, "user", message, timestamp) VALUES ($1, $2, $3, $4)`,
        [channel, user, message, timestamp]
      );
      const broadcastData = {
        ...data,
        timestamp: timestamp.toLocaleString('pt-BR')
      };
      // Emite para TODOS no canal
      io.to(channel).emit('newMessage', broadcastData);
    } catch (err) {
      console.error('Erro ao guardar mensagem:', err);
    }
  });

  // 3. OUVIR QUANDO O UTILIZADOR SE DESCONECTA
  socket.on('disconnect', () => {
    console.log(`Utilizador desconectou-se: ${socket.id}`);
  });
});

// --- Iniciar o Servidor ---
setupDatabase().then(() => {
  server.listen(port, () => {
    console.log(`OrkCord a rodar na porta ${port}`);
  });
});