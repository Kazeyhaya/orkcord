const express = require('express');
const router = express.Router();
// 👇 MUDANÇA: Caminho corrigido para subir um nível (..)
const postController = require('../controllers/post.controller'); // Importa o nosso Controlador

// Rota para o Feed Pessoal (GET /api/posts?user=...)
router.get('/', postController.getFeed);

// Rota para o Feed Explorar (GET /api/posts/explore)
router.get('/explore', postController.getExplore);

// Rota para Criar Post (POST /api/posts)
router.post('/', postController.createNewPost);

// Rota para Like (POST /api/posts/:id/like)
router.post('/:id/like', postController.addLike);

// Rota para Unlike (POST /api/posts/:id/unlike)
router.post('/:id/unlike', postController.removeLike);

// (Aqui migrariamos as rotas de Comentários)

module.exports = router;