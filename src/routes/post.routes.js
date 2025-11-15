// src/routes/post.routes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller'); // Importa o nosso Controlador

// Rota para o Feed Pessoal (GET /api/posts?user=...)
router.get('/', postController.getFeed);

// Rota para o Feed Explorar (GET /api/posts/explore)
router.get('/explore', postController.getExplore);

// Rota para Criar Post (POST /api/posts)
router.post('/', postController.createNewPost);

// 👇 NOVA ROTA DE ATUALIZAÇÃO (EDITAR) 👇
// [POST] /api/posts/:id/update
router.post('/:id/update', postController.updatePost);

// Rota para Like (POST /api/posts/:id/like)
router.post('/:id/like', postController.addLike);

// Rota para Unlike (POST /api/posts/:id/unlike)
router.post('/:id/unlike', postController.removeLike);

// --- ROTAS DE COMENTÁRIOS ---

// Rota para buscar comentários (GET /api/posts/:id/comments)
router.get('/:id/comments', postController.getPostComments);

// Rota para criar comentário (POST /api/posts/:id/comments)
router.post('/:id/comments', postController.addPostComment);


module.exports = router;