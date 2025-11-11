const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg'); // Importa o 'pg' (PostgreSQL)

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// --- Configuração do Banco de Dados PostgreSQL ---
// O 'pg' automaticamente usa a variável de ambiente DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para conexões no Render
  }
});

// Função para criar a tabela se ela não existir
async function setupDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        channel TEXT NOT NULL,
        "user" TEXT NOT NULL, 
        message TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Tabela "messages" verificada/criada com sucesso.');
  } catch (err) {
    console.error('Erro ao criar tabela:', err);
  } finally {
    client.release();
  }
}

// --- Servir o Frontend ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'orkcord.html')); 
});

// --- Lógica do Socket.IO com PostgreSQL ---
io.on('connection', (socket) => {
  console.log(`Um utilizador conectou-se: ${socket.id}`);

  // 1. OUVIR QUANDO O UTILIZADOR MUDA DE CANAL
  socket.on('joinChannel', async (channelName) => {
    try {
      console.log(`Utilizador ${socket.id} entrou no canal ${channelName}`);
      socket.join(channelName); 

      // Carrega o histórico do banco de dados
      const result = await pool.query(
        `SELECT * FROM messages WHERE channel = $1 ORDER BY timestamp ASC LIMIT 50`, 
        [channelName]
      );
      
      // Converte o formato do timestamp para o frontend (se necessário)
      const history = result.rows.map(row => ({
        ...row,
        user: row.user, // 'user' é uma palavra reservada, pode precisar de aspas
        timestamp: new Date(row.timestamp).toLocaleString('pt-BR')
      }));

      socket.emit('loadHistory', history);

    } catch (err) {
      console.error('Erro em joinChannel:', err);
    }
  });

  // 2. OUVIR QUANDO O UTILIZADOR ENVIA UMA MENSAGEM
  socket.on('sendMessage', async (data) => {
    const { channel, user, message } = data;
    const timestamp = new Date();

    try {
      // Guarda a nova mensagem no banco de dados
      await pool.query(
        `INSERT INTO messages (channel, "user", message, timestamp) VALUES ($1, $2, $3, $4)`,
        [channel, user, message, timestamp]
      );

      // Prepara os dados para enviar de volta (com timestamp formatado)
      const broadcastData = {
        ...data,
        timestamp: timestamp.toLocaleString('pt-BR')
      };

      // Emite a nova mensagem para TODOS na sala (canal)
      io.to(channel).emit('newMessage', broadcastData);

    } catch (err) {
      console.error('Erro ao guardar mensagem:', err);
    }
  });

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