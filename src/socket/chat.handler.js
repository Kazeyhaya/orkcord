// src/socket/chat.handler.js
const Message = require('../models/message.class');
const Profile = require('../models/profile.class');

function initializeSocket(io) {

  io.on('connection', (socket) => {
    console.log(`Um utilizador conectou-se: ${socket.id}`);
    
    // Isto agora serve para DMs (ex: 'alexandre_tsuki')
    socket.on('joinChannel', async (data) => {
      try {
        const { channel, user } = data;
        socket.join(channel);
        console.log(`${user} entrou no canal: ${channel}`);
        
        const history = await Message.getHistory(channel);
        
        socket.emit('loadHistory', history);
        
      } catch (err) {
        console.error("Erro em 'joinChannel':", err);
      }
    });
    
    socket.on('sendMessage', async (data) => {
      try {
        const { channel, user, message } = data;
        
        const newMessage = new Message({ channel, user, message });
        await newMessage.save();
        
        const profile = await Profile.findByUser(user);
        if (profile) {
          newMessage.avatar_url = profile.avatar_url;
        }
        
        io.to(channel).emit('newMessage', newMessage);

      } catch (err) {
         console.error("Erro em 'sendMessage':", err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Utilizador desconectou-se: ${socket.id}`);
    });
  });
}

module.exports = {
  initializeSocket
};