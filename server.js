const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.json());
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
    await client.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, channel TEXT NOT NULL, "user" TEXT NOT NULL, message TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, "user" TEXT NOT NULL, text TEXT NOT NULL, likes INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS profiles ("user" TEXT PRIMARY KEY, bio TEXT)`);
    await client.query(`CREATE TABLE IF NOT EXISTS testimonials (id SERIAL PRIMARY KEY, "from_user" TEXT NOT NULL, "to_user" TEXT NOT NULL, text TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, "user" TEXT NOT NULL, text TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`CREATE TABLE IF NOT EXISTS follows (id SERIAL PRIMARY KEY, follower_user TEXT NOT NULL, following_user TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW(), UNIQUE(follower_user, following_user))`);
    await client.query(`CREATE TABLE IF NOT EXISTS communities (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, emoji TEXT, members INT DEFAULT 0, timestamp TIMESTAMPTZ DEFAULT NOW())`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_members (
        id SERIAL PRIMARY KEY,
        user_name TEXT NOT NULL,
        community_id INT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_name, community_id) 
      )
    `);
    
    console.log('Tabelas (incluindo "community_members") verificadas/criadas.');

  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  } finally {
    client.release();
  }
}

// Função para inserir dados falsos
async function seedDatabase() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT 1 FROM communities LIMIT 1');
    if (res.rows.length === 0) {
      console.log('Populando o banco de dados com comunidades de teste...');
      await client.query(`
        INSERT INTO communities (name, description, emoji, members) VALUES
        ('Tecnologia 💻', 'A comunidade oficial para falar de hardware, software e programação.', '💻', 1),
        ('Música 🎵', 'Do Rock ao Pop, partilhe as suas batidas favoritas.', '🎵', 1),
        ('Games 🎮', 'Discussão geral, do retro ao moderno. Encontre o seu "x1" aqui.', '🎮', 1)
      `);
      console.log('Comunidades de teste inseridas.');
    }
  } catch (err) {
    console.error('Erro ao popular dados:', err);
  } finally {
    client.release();
  }
}

// ===================================================
// ROTAS DO SERVIDOR
// ===================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'agora.html')); 
});

// --- API (Feed, Perfil, Amigos, etc.) ---
// ... (rotas /api/posts, /profile, /following, /follow, etc. - Sem mudanças) ...
app.get('/api/posts', async (req, res) => {
  const { user } = req.query; 
  if (!user) { return res.status(400).json({ error: 'Utilizador não fornecido' }); }
  try {
    const result = await pool.query(`SELECT p.* FROM posts p LEFT JOIN follows f ON p."user" = f.following_user WHERE f.follower_user = $1 OR p."user" = $1 ORDER BY p.timestamp DESC LIMIT 30`, [user]);
    res.json({ posts: result.rows });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.get('/api/posts/explore', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM posts ORDER BY timestamp DESC LIMIT 30`);
    res.json({ posts: result.rows });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.post('/api/posts', async (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) { return res.status(400).json({ error: 'Usuário e texto são obrigatórios' }); }
  try {
    const result = await pool.query(`INSERT INTO posts ("user", text, timestamp) VALUES ($1, $2, NOW()) RETURNING *`, [user, text]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params; 
    const result = await pool.query(`UPDATE posts SET likes = likes + 1 WHERE id = $1 RETURNING likes`, [id]);
    if (result.rows.length === 0) { return res.status(404).json({ error: 'Post não encontrado' }); }
    res.status(200).json(result.rows[0]); 
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.post('/api/posts/:id/unlike', async (req, res) => {
  try {
    const { id } = req.params; 
    const result = await pool.query(`UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = $1 RETURNING likes`, [id]);
    if (result.rows.length === 0) { return res.status(404).json({ error: 'Post não encontrado' }); }
    res.status(200).json(result.rows[0]); 
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.get('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(`SELECT bio FROM profiles WHERE "user" = $1`, [username]);
    if (result.rows.length > 0) { res.json(result.rows[0]); } else { res.json({ bio: "Apaixonado por comunidades e bate-papo." }); }
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.post('/api/profile', async (req, res) => {
  const { user, bio } = req.body;
  if (!user || bio === undefined) { return res.status(400).json({ error: 'Usuário e bio são obrigatórios' }); }
  try {
    const result = await pool.query(`INSERT INTO profiles ("user", bio) VALUES ($1, $2) ON CONFLICT ("user") DO UPDATE SET bio = $2 RETURNING *`, [user, bio]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.get('/api/testimonials/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(`SELECT * FROM testimonials WHERE "to_user" = $1 ORDER BY timestamp DESC LIMIT 30`, [username]);
    res.json({ testimonials: result.rows });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.post('/api/testimonials', async (req, res) => {
  const { from_user, to_user, text } = req.body; 
  if (!from_user || !to_user || !text) { return res.status(400).json({ error: 'Todos os campos são obrigatórios' }); }
  try {
    const result = await pool.query(`INSERT INTO testimonials ("from_user", "to_user", text, timestamp) VALUES ($1, $2, $3, NOW()) RETURNING *`, [from_user, to_user, text]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params; 
    const result = await pool.query(`SELECT * FROM comments WHERE post_id = $1 ORDER BY timestamp ASC`, [id]);
    res.json({ comments: result.rows });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params; 
    const { user, text } = req.body; 
    if (!user || !text) { return res.status(400).json({ error: 'Usuário e texto são obrigatórios' }); }
    const result = await pool.query(`INSERT INTO comments (post_id, "user", text, timestamp) VALUES ($1, $2, $3, NOW()) RETURNING *`, [id, user, text]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.get('/api/following/:username', async (req, res) => {
  const { username } = req.params; 
  try {
    const result = await pool.query(`SELECT following_user FROM follows WHERE follower_user = $1`, [username]);
    res.json({ following: result.rows.map(row => row.following_user) });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.get('/api/isfollowing/:username', async (req, res) => {
  const { follower } = req.query;
  const { username } = req.params;
  if (!follower || !username) { return res.status(400).json({ error: 'Faltam parâmetros' }); }
  try {
    const result = await pool.query(`SELECT 1 FROM follows WHERE follower_user = $1 AND following_user = $2`, [follower, username]);
    res.json({ isFollowing: result.rows.length > 0 });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.post('/api/follow', async (req, res) => {
  const { follower, following } = req.body; 
  if (!follower || !following) { return res.status(400).json({ error: 'Faltam parâmetros' }); }
  try {
    await pool.query(`INSERT INTO follows (follower_user, following_user) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [follower, following]);
    res.status(201).json({ message: 'Seguido com sucesso' });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});
app.post('/api/unfollow', async (req, res) => {
  const { follower, following } = req.body;
  if (!follower || !following) { return res.status(400).json({ error: 'Faltam parâmetros' }); }
  try {
    await pool.query(`DELETE FROM follows WHERE follower_user = $1 AND following_user = $2`, [follower, following]);
    res.status(200).json({ message: 'Deixou de seguir com sucesso' });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

// --- API (Comunidades) ---

// ===============================================
// 👇 MUDANÇA: ROTA "EXPLORAR COMUNIDADES" ATUALIZADA 👇
// ===============================================
app.get('/api/communities/explore', async (req, res) => {
  const { user_name } = req.query; // ex: /api/communities/explore?user_name=Alexandre
  if (!user_name) {
    return res.status(400).json({ error: 'Utilizador não fornecido' });
  }
  
  try {
    // Esta consulta SQL agora é mais inteligente:
    // 1. Seleciona todas as comunidades (c)
    // 2. Faz um LEFT JOIN com community_members (cm) para *este* utilizador
    // 3. ONDE cm.user_name IS NULL (ou seja, onde não houve correspondência)
    // 4. Isto retorna apenas comunidades onde o utilizador NÃO está.
    const result = await pool.query(
      `SELECT c.* FROM communities c
       LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_name = $1
       WHERE cm.user_name IS NULL
       ORDER BY c.members DESC`,
      [user_name]
    );
    res.json({ communities: result.rows });
  } catch (err) {
    console.error('Erro ao buscar comunidades:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/community/join', async (req, res) => {
  const { user_name, community_id } = req.body;
  if (!user_name || !community_id) {
    return res.status(400).json({ error: 'Faltam dados' });
  }
  try {
    await pool.query(`INSERT INTO community_members (user_name, community_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [user_name, community_id]);
    const communityData = await pool.query(`SELECT * FROM communities WHERE id = $1`, [community_id]);
    res.status(201).json({ community: communityData.rows[0] });
  } catch (err) {
    console.error('Erro ao entrar na comunidade:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});
app.get('/api/communities/joined', async (req, res) => {
  const { user_name } = req.query; 
  if (!user_name) {
    return res.status(400).json({ error: 'Utilizador não fornecido' });
  }
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.emoji 
       FROM communities c
       JOIN community_members cm ON c.id = cm.community_id
       WHERE cm.user_name = $1`,
      [user_name]
    );
    res.json({ communities: result.rows });
  } catch (err) {
    console.error('Erro ao buscar comunidades do utilizador:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});


// --- Lógica do Socket.IO (Chat) ---
// ... (sem mudanças) ...
io.on('connection', (socket) => {
  console.log(`Um utilizador conectou-se: ${socket.id}`);
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
  socket.on('disconnect', () => {
    console.log(`Utilizador desconectou-se: ${socket.id}`);
  });
});

// --- Iniciar o Servidor ---
setupDatabase()
  .then(() => seedDatabase()) 
  .then(() => {
    server.listen(port, () => {
      console.log(`Agora a rodar na porta ${port}`);
    });
  });