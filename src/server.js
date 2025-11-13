// src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./models/db'); // Importa o nosso módulo de BD

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// --- ROTAS DA API ---

// 1. ROTAS REATORADAS (POSTS E COMENTÁRIOS)
const postRoutes = require('./routes/post.routes');
app.use('/api/posts', postRoutes);

// 2. ROTAS REATORADAS (PERFIL E SEGUIR)
const profileRoutes = require('./routes/profile.routes');
app.use('/api', profileRoutes);

// 3. NOVAS ROTAS REATORADAS (DEPOIMENTOS)
const testimonialRoutes = require('./routes/testimonial.routes');
app.use('/api/testimonials', testimonialRoutes);


// 4. ROTAS EM FALTA (TEMPORARIAMENTE NO SERVER.JS)
// (Apenas as rotas de Comunidades restam aqui)

// --- Rotas de Comunidades ---

app.get('/api/communities/joined', async (req, res) => {
    try {
        const { user_name } = req.query;
        const result = await db.query(
            'SELECT c.id, c.name, c.emoji FROM communities c JOIN community_members cm ON c.id = cm.community_id WHERE cm.user_name = $1',
            [user_name]
        );
        res.json({ communities: result.rows });
    } catch (err) { 
      console.error("Erro em GET /api/communities/joined:", err);
      res.status(500).json({ error: 'Erro ao buscar comunidades' }); 
    }
});

app.get('/api/communities/explore', async (req, res) => {
    try {
        const { user_name } = req.query;
        const result = await db.query(
            `SELECT c.id, c.name, c.emoji, c.description
             FROM communities c
             WHERE NOT EXISTS (
                SELECT 1 FROM community_members cm WHERE cm.community_id = c.id AND cm.user_name = $1
             )`,
            [user_name]
        );
        res.json({ communities: result.rows });
    } catch (err) { 
      console.error("Erro em GET /api/communities/explore:", err);
      res.status(500).json({ error: 'Erro ao explorar comunidades' }); 
    }
});

app.post('/api/community/join', async (req, res) => {
    try {
        const { user_name, community_id } = req.body;
        await db.query('INSERT INTO community_members (user_name, community_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user_name, community_id]);
        await db.query('UPDATE communities SET members = (SELECT COUNT(*) FROM community_members WHERE community_id = $1) WHERE id = $1', [community_id]);
        const comm = await db.query('SELECT id, name, emoji FROM communities WHERE id = $1', [community_id]);
        res.status(201).json({ community: comm.rows[0] });
    } catch (err) { 
      console.error("Erro em POST /api/community/join:", err);
      res.status(500).json({ error: 'Erro ao entrar' }); 
    }
});

app.post('/api/communities/create', async (req, res) => {
    try {
        const { name, emoji, creator } = req.body;
        const newComm = await db.query(
            'INSERT INTO communities (name, emoji, description, members) VALUES ($1, $2, $3, 1) RETURNING id, name, emoji',
            [name, emoji || '💬', 'Bem-vindo a esta nova comunidade!']
        );
        const newCommunity = newComm.rows[0];
        await db.query('INSERT INTO community_members (user_name, community_id) VALUES ($1, $2)', [creator, newCommunity.id]);
        res.status(201).json({ community: newCommunity });
    } catch (err) { 
      console.error("Erro em POST /api/communities/create:", err);
      res.status(500).json({ error: 'Erro ao criar comunidade' }); 
    }
});

app.get('/api/community/:id/posts', async (req, res) => {
     try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM community_posts WHERE community_id = $1 ORDER BY timestamp DESC', [id]);
        res.json({ posts: result.rows });
    } catch (err) { 
      console.error("Erro em GET /api/community/:id/posts:", err);
      res.status(500).json({ error: 'Erro ao buscar posts' }); 
    }
});

// --- ROTA PRINCIPAL (O HTML) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'agora.html')); 
});

// --- Lógica do Socket.IO (Chat) ---
const channelsHistory = { 'geral': [], 'scraps': [], 'testimonials': [], 'albums': [], 'voz-g1': [], 'voz-music': [] };

io.on('connection', (socket) => {
  console.log(`Um utilizador conectou-se: ${socket.id}`);
  
  socket.on('joinChannel', (data) => {
    const { channel, user } = data;
    socket.join(channel);
    console.log(`${user} entrou no canal: ${channel}`);
    if (channelsHistory[channel]) {
      socket.emit('loadHistory', channelsHistory[channel]);
    }
  });
  
  socket.on('sendMessage', (data) => {
    const { channel } = data;
    if (!channelsHistory[channel]) channelsHistory[channel] = [];
    channelsHistory[channel].push(data);
    if (channelsHistory[channel].length > 50) {
      channelsHistory[channel].shift();
    }
    io.to(channel).emit('newMessage', data);
  });

  socket.on('disconnect', () => {
    console.log(`Utilizador desconectou-se: ${socket.id}`);
  });
});

// --- Iniciar o Servidor ---
db.setupDatabase().then(() => {
  server.listen(port, () => {
    console.log(`🚀 Agora a rodar na porta ${port}`);
  });
}).catch(err => {
    console.error("Falha crítica ao iniciar a base de dados:", err);
    process.exit(1);
});