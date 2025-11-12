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

// Habilita a pasta 'assets'
app.use('/assets', express.static(path.join(__dirname, 'assets')));


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

    // Tabela de Perfis (da Bio)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        "user" TEXT PRIMARY KEY,
        bio TEXT
      )
    `);
    
    // Tabela de Depoimentos (Testimonials)
    await client.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        "from_user" TEXT NOT NULL,
        "to_user" TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Tabela de Comentários
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        "user" TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ===============================================
    // 👇 NOVA TABELA 'FOLLOWS' ADICIONADA AQUI 👇
    // ===============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_user TEXT NOT NULL, -- Quem segue
        following_user TEXT NOT NULL, -- Quem está a ser seguido
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(follower_user, following_user) -- Impede seguir a mesma pessoa duas vezes
      )
    `);
    
    console.log('Tabelas (incluindo "follows") verificadas/criadas.');

  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  } finally {
    client.release();
  }
}

// ===================================================
// ROTAS DO SERVIDOR
// ===================================================

// --- Rota Principal (O HTML) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'agora.html')); 
});

// --- API (Parte "Feed") ---

// [GET] Rota para LER todos os posts do Feed
app.get('/api/posts', async (req, res) => {
  try {
    // POR ENQUANTO, esta rota ainda mostra TODOS os posts.
    // Vamos alterá-la no Passo 4.
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

// [POST] Rota para DAR LIKE em um post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params; 
    const result = await pool.query(
      `UPDATE posts SET likes = likes + 1 WHERE id = $1 RETURNING likes`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    res.status(200).json(result.rows[0]); 
  } catch (err) {
    console.error('Erro ao dar like:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// [POST] Rota para DESCURTIR (UNLIKE) um post
app.post('/api/posts/:id/unlike', async (req, res) => {
  try {
    const { id } = req.params; 
    const result = await pool.query(
      `UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = $1 RETURNING likes`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    res.status(200).json(result.rows[0]); 
  } catch (err)
 {
    console.error('Erro ao descurtir:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- API (Parte "Perfil") ---
app.get('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(
      `SELECT bio FROM profiles WHERE "user" = $1`,
      [username]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json({ bio: "Apaixonado por comunidades e bate-papo." });
    }
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/profile', async (req, res) => {
  const { user, bio } = req.body;
  if (!user || bio === undefined) {
    return res.status(400).json({ error: 'Usuário e bio são obrigatórios' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO profiles ("user", bio) 
       VALUES ($1, $2)
       ON CONFLICT ("user") 
       DO UPDATE SET bio = $2
       RETURNING *`,
      [user, bio]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar bio:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- API (Parte "Depoimentos") ---
app.get('/api/testimonials/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(
      `SELECT * FROM testimonials WHERE "to_user" = $1 ORDER BY timestamp DESC LIMIT 30`,
      [username]
    );
    res.json({ testimonials: result.rows });
  } catch (err) {
    console.error('Erro ao buscar depoimentos:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/testimonials', async (req, res) => {
  const { from_user, to_user, text } = req.body; 
  if (!from_user || !to_user || !text) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO testimonials ("from_user", "to_user", text, timestamp) VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [from_user, to_user, text]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar depoimento:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// --- API (Parte "Comentários") ---
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params; // ID do post
    const result = await pool.query(
      `SELECT * FROM comments WHERE post_id = $1 ORDER BY timestamp ASC`,
      [id]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error('Erro ao buscar comentários:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params; // ID do post
    const { user, text } = req.body; 

    if (!user || !text) {
      return res.status(400).json({ error: 'Usuário e texto são obrigatórios' });
    }
    
    const result = await pool.query(
      `INSERT INTO comments (post_id, "user", text, timestamp) VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [id, user, text]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar comentário:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ===============================================
// 👇 NOVAS ROTAS DE "SEGUIR" (FOLLOW) AQUI 👇
// ===============================================

// [GET] Verifica se o utilizador X segue o utilizador Y
app.get('/api/isfollowing/:username', async (req, res) => {
  // :username é o *perfil que estamos a ver* (following_user)
  // O utilizador logado (follower_user) vem no body
  const { follower } = req.query; // ex: /api/isfollowing/chico?follower=Alexandre
  const { username } = req.params;

  if (!follower || !username) {
    return res.status(400).json({ error: 'Faltam parâmetros' });
  }
  
  try {
    const result = await pool.query(
      `SELECT 1 FROM follows WHERE follower_user = $1 AND following_user = $2`,
      [follower, username]
    );
    res.json({ isFollowing: result.rows.length > 0 });
  } catch (err) {
    console.error('Erro ao verificar se segue:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// [POST] Seguir um utilizador
app.post('/api/follow', async (req, res) => {
  const { follower, following } = req.body; // { follower: "Alexandre", following: "chico" }
  if (!follower || !following) {
    return res.status(400).json({ error: 'Faltam parâmetros' });
  }
  try {
    await pool.query(
      `INSERT INTO follows (follower_user, following_user) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [follower, following]
    );
    res.status(201).json({ message: 'Seguido com sucesso' });
  } catch (err) {
    console.error('Erro ao seguir:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// [POST] Deixar de seguir um utilizador
app.post('/api/unfollow', async (req, res) => {
  const { follower, following } = req.body;
  if (!follower || !following) {
    return res.status(400).json({ error: 'Faltam parâmetros' });
  }
  try {
    await pool.query(
      `DELETE FROM follows WHERE follower_user = $1 AND following_user = $2`,
      [follower, following]
    );
    res.status(200).json({ message: 'Deixou de seguir com sucesso' });
  } catch (err) {
    console.error('Erro ao deixar de seguir:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});


// --- Lógica do Socket.IO (Parte "Discord") ---
io.on('connection', (socket) => {
  console.log(`Um utilizador conectou-se: ${socket.id}`);

  // 1. OUVIR QUANDO O UTILIZADOR MUDA DE CANAL
  socket.on('joinChannel', async (data) => {
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

  // 2. OUVIR QUANDO O UTILIZADOR ENVIA UMA MENSAGEM
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
    console.log(`Agora a rodar na porta ${port}`);
  });
});