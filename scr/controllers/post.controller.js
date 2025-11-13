// 👇 MUDANÇA: Caminho corrigido para subir um nível (..)
const Post = require('../models/post.model'); // Importa o Modelo

// [GET] /api/posts (Feed Pessoal)
const getFeed = async (req, res) => {
  const { user } = req.query;
  if (!user) {
    return res.status(400).json({ error: 'Utilizador não fornecido' });
  }
  try {
    const posts = await Post.getPersonalizedFeed(user);
    res.json({ posts });
  } catch (err) {
    console.error('Erro no controlador getFeed:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [GET] /api/posts/explore (Feed Global)
const getExplore = async (req, res) => {
  try {
    const posts = await Post.getGlobalFeed();
    res.json({ posts });
  } catch (err) {
    console.error('Erro no controlador getExplore:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [POST] /api/posts (Criar Post)
const createNewPost = async (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) {
    return res.status(400).json({ error: 'Usuário e texto são obrigatórios' });
  }
  try {
    const newPost = await Post.createPost(user, text);
    res.status(201).json(newPost);
  } catch (err) {
    console.error('Erro no controlador createNewPost:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [POST] /api/posts/:id/like
const addLike = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Post.likePost(id);
    if (!result) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error('Erro no controlador addLike:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [POST] /api/posts/:id/unlike
const removeLike = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Post.unlikePost(id);
    if (!result) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    res.status(200).json(result);
  } catch (err) {
    console.error('Erro no controlador removeLike:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

module.exports = {
  getFeed,
  getExplore,
  createNewPost,
  addLike,
  removeLike
};