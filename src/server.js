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

// --- ROTAS DA API (TOTALMENTE REATORADAS) ---

// 1. ROTAS DE POSTS (Feed, Likes, Comentários)
const postRoutes = require('./routes/post.routes');
app.use('/api/posts', postRoutes);

// 2. ROTAS DE PERFIL (Perfil, Seguir, Amigos)
const profileRoutes = require('./routes/profile.routes');
app.use('/api', profileRoutes); // Monta em /api para apanhar /api/profile, /api/follow, etc.

// 3. ROTAS DE DEPOIMENTOS
const testimonialRoutes = require('./routes/testimonial.routes');
app.use('/api/testimonials', testimonialRoutes);

// 4. ROTAS DE COMUNIDADES (Plural e Singular)
const { communitiesRouter, communityRouter } = require('./routes/community.routes');
app.use('/api/communities', communitiesRouter); // Rotas no plural (ex: /api/communities/explore)
app.use('/api/community', communityRouter);   // Rotas no singular (ex: /api/community/join)


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