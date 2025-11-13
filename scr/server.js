const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
// 👇 MUDANÇA: O caminho foi corrigido para o mesmo diretório (./)
const db = require('./models/db'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
// O 'path.join' aqui sobe um nível (..) para encontrar a pasta 'assets'
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// --- ROTAS DA API ---
// 👇 MUDANÇA: O caminho foi corrigido para o mesmo diretório (./)
const postRoutes = require('./routes/post.routes');
app.use('/api/posts', postRoutes);

// (Vamos migrar o resto das rotas depois que isto funcionar)


// --- ROTA PRINCIPAL (O HTML) ---
app.get('/', (req, res) => {
  // O 'path.join' aqui sobe um nível (..) para encontrar o 'agora.html'
  res.sendFile(path.join(__dirname, '..', 'agora.html')); 
});

// --- Lógica do Socket.IO (Chat) ---
// (A lógica de Socket.IO ainda vive aqui temporariamente)
io.on('connection', (socket) => {
  console.log(`Um utilizador conectou-se: ${socket.id}`);
  
  socket.on('joinChannel', async (data) => {
    // ... (lógica do joinChannel) ...
  });
  
  socket.on('sendMessage', async (data) => {
    // ... (lógica do sendMessage) ...
  });

  socket.on('disconnect', () => {
    console.log(`Utilizador desconectou-se: ${socket.id}`);
  });
});

// --- Iniciar o Servidor ---
db.setupDatabase().then(() => {
  server.listen(port, () => {
    console.log(`Agora a rodar na porta ${port}`);
  });
});