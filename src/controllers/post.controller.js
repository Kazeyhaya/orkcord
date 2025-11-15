// src/controllers/post.controller.js
const Post = require('../models/post.class'); 

// ... (getFeed, getExplore, createNewPost, addLike, removeLike, getPostComments, addPostComment... continuam iguais) ...
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
  if (text.length > 500) {
     return res.status(400).json({ error: 'O post não pode exceder 500 caracteres.' });
  }

  try {
    const post = new Post({ user: user, text: text });
    await post.save(); 
    res.status(201).json(post);
  } catch (err) {
    console.error('Erro no controlador createNewPost:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [POST] /api/posts/:id/like
const addLike = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id); 
    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    await post.addLike(); 
    res.status(200).json(post);
  } catch (err) {
    console.error('Erro no controlador addLike:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [POST] /api/posts/:id/unlike
const removeLike = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    await post.removeLike();
    res.status(200).json(post);
  } catch (err) {
    console.error('Erro no controlador removeLike:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// [GET] /api/posts/:id/comments
const getPostComments = async (req, res) => {
    try {
        const { id } = req.params;
        const comments = await Post.getComments(id);
        res.json({ comments });
    } catch (err) {
        console.error('Erro no controlador getPostComments:', err);
        res.status(500).json({ error: 'Erro ao buscar comentários' });
    }
};

// [POST] /api/posts/:id/comments
const addPostComment = async (req, res) => {
    try {
        const { id } = req.params; 
        const { user, text } = req.body;

        if (!user || !text) {
            return res.status(400).json({ error: 'Utilizador e texto são obrigatórios' });
        }
        if (text.length > 280) {
             return res.status(400).json({ error: 'O comentário não pode exceder 280 caracteres.' });
        }
        
        const post = await Post.findById(id);
        if (!post) {
             return res.status(404).json({ error: 'Post não encontrado' });
        }
        
        const newComment = await Post.createComment(id, user, text);
        res.status(201).json(newComment);
    } catch (err) {
        console.error('Erro no controlador addPostComment:', err);
        res.status(500).json({ error: 'Erro ao criar comentário' });
    }
};

// 👇 NOVO CONTROLADOR ADICIONADO 👇
// [POST] /api/posts/:id/update
const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { user, text } = req.body; // 'user' é quem tenta editar, 'text' é o novo texto

        if (!user || !text) {
            return res.status(400).json({ error: 'Utilizador e texto são obrigatórios.' });
        }
        if (text.length > 500) {
            return res.status(400).json({ error: 'O post não pode exceder 500 caracteres.' });
        }

        const updatedPost = await Post.update(id, user, text);
        res.json(updatedPost);

    } catch (err) {
        console.error('Erro no controlador updatePost:', err);
        // Trata erros de autorização
        if (err.message === 'Não autorizado') {
            return res.status(403).json({ error: 'Apenas o autor pode editar este post.' });
        }
        if (err.message === 'Post não encontrado') {
            return res.status(404).json({ error: 'Post não encontrado.' });
        }
        res.status(500).json({ error: 'Erro ao atualizar o post' });
    }
};
// 👆 FIM DO NOVO CONTROLADOR 👆


module.exports = {
  getFeed,
  getExplore,
  createNewPost,
  addLike,
  removeLike,
  getPostComments,
  addPostComment,
  updatePost // <-- Exporta o novo controlador
};