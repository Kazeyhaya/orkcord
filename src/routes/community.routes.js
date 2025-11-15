// src/routes/community.routes.js
const express = require('express');
const communityController = require('../controllers/community.controller');

// Router 1: Para rotas que começam com /api/communities (plural)
const communitiesRouter = express.Router();
communitiesRouter.get('/joined', communityController.getJoined);
communitiesRouter.get('/explore', communityController.getExplore);
communitiesRouter.post('/create', communityController.create);


// Router 2: Para rotas que começam com /api/community (singular)
const communityRouter = express.Router();
communityRouter.post('/join', communityController.join);
communityRouter.get('/:id/posts', communityController.getPosts);
communityRouter.get('/:id/members', communityController.getMembers);
communityRouter.get('/:id/details', communityController.getDetails);
communityRouter.post('/:id/update', communityController.updateDetails); // Rota de Edição (da msg anterior)

// 👇 NOVA ROTA ADICIONADA (POST para criar tópico) 👇
communityRouter.post('/posts', communityController.createCommunityPost);


// Exportamos os dois routers
module.exports = {
  communitiesRouter,
  communityRouter
};