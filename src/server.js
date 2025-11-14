// src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); // Re-adicionado
const path = require('path');
const db = require('./models/db');

// --- CONFIGURAÇÃO INICIAL ---
const app = express();
const server = http.createServer(app);
const io = new Server(server); // Re-adicionado
const port = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});


// --- ROTAS DA API ---
const postRoutes = require('./routes/post.routes');
app.use('/api/posts', postRoutes);

const profileRoutes = require('./routes/profile.routes');
app.use('/api', profileRoutes);

const testimonialRoutes = require('./routes/testimonial.routes');
app.use('/api/testimonials', testimonialRoutes);

const { communitiesRouter, communityRouter } = require('./routes/community.routes');
app.use('/api/communities', communitiesRouter);
app.use('/api/community', communityRouter);


// --- ROTA PRINCIPAL (O HTML) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'agora.html')); 
});

// --- LÓGICA DO SOCKET.IO (Apenas para DMs) ---
const { initializeSocket } = require('./socket/chat.handler'); // Re-adicionado
initializeSocket(io); // Re-adicionado


// --- INICIAR O SERVIDOR ---
if (require.main === module) {
  db.setupDatabase().then(() => {
    server.listen(port, () => {
      console.log(`🚀 Agora a rodar na porta ${port}`);
    });
  }).catch(err => {
      console.error("Falha crítica ao iniciar a base de dados:", err);
      process.exit(1);
  });
}

module.exports = app;