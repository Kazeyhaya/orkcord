const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: { origin: '*' }
});

// Histórico simples em memória por canal (apenas para demo)
// Em produção, mover para um banco (Postgres/Mongo) com paginação
const channelHistory = new Map(); // channel -> [{user,text,ts}]
const HISTORY_LIMIT = 100;

// Servir arquivos estáticos a partir do diretório atual
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Rota raiz para servir o index.html do front-end
app.get('/', (_req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint de histórico: /api/history?channel=geral
app.get('/api/history', (req, res) => {
	const channel = String(req.query.channel || '').trim();
	if (!channel) return res.status(400).json({ error: 'channel required' });
	const items = channelHistory.get(channel) || [];
	res.json({ channel, messages: items });
});

io.on('connection', (socket) => {
	let currentChannel = null;
	let currentUser = null;

	// Usuário entra em um canal (sala)
	socket.on('joinChannel', (payload) => {
		const channel = typeof payload === 'string' ? payload : payload?.channel;
		const user = typeof payload === 'object' ? payload?.user : null;
		if (typeof channel !== 'string' || !channel.trim()) return;
		if (currentChannel) socket.leave(currentChannel);
		currentChannel = channel.trim();
		currentUser = typeof user === 'string' && user.trim() ? user.trim() : currentUser;
		socket.join(currentChannel);
	});

	// Recebe mensagem e retransmite para todos na sala (exceto o remetente)
	socket.on('sendMessage', (payload) => {
		const { channel, text, user } = payload || {};
		if (typeof channel !== 'string' || !channel.trim()) return;
		if (typeof text !== 'string' || !text.trim()) return;
		const safeChannel = channel.trim();
		const ts = Date.now();
		const author = typeof user === 'string' && user.trim() ? user.trim() : (currentUser || 'Anônimo');
		// Armazena no histórico
		const list = channelHistory.get(safeChannel) || [];
		list.push({ user: author, text, ts });
		while (list.length > HISTORY_LIMIT) list.shift();
		channelHistory.set(safeChannel, list);
		// Emite para todos exceto remetente
		io.to(safeChannel).except(socket.id).emit('message', { channel: safeChannel, text, ts, user: author });
	});

	// Indicador "digitando"
	socket.on('typing', (payload) => {
		const { channel, user, typing } = payload || {};
		if (typeof channel !== 'string' || !channel.trim()) return;
		const who = typeof user === 'string' && user.trim() ? user.trim() : (currentUser || 'Membro');
		socket.broadcast.to(channel.trim()).emit('typing', { channel: channel.trim(), user: who, typing: !!typing });
	});
});

server.listen(PORT, () => {
	console.log(`OrkCord backend running on http://localhost:${PORT}`);
});


