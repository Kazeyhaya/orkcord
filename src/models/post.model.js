// src/models/post.model.js
const db = require('./db'); // Importa a nossa ligação 'pool'

// [GET] Obter o feed personalizado
const getPersonalizedFeed = async (userName) => {
  const result = await db.query(
    `SELECT p.* FROM posts p
     LEFT JOIN follows f ON p."user" = f.following_user
     WHERE f.follower_user = $1 OR p."user" = $1
     ORDER BY p.timestamp DESC
     LIMIT 30`,
    [userName]
  );
  return result.rows;
};

// [GET] Obter o feed global (Explorar)
const getGlobalFeed = async () => {
  const result = await db.query(`SELECT * FROM posts ORDER BY timestamp DESC LIMIT 30`);
  return result.rows;
};

// [POST] Criar um post
const createPost = async (user, text) => {
  const result = await db.query(
    `INSERT INTO posts ("user", text, timestamp) VALUES ($1, $2, NOW()) RETURNING *`,
    [user, text]
  );
  return result.rows[0];
};

// [POST] Dar Like
const likePost = async (postId) => {
  const result = await db.query(
    `UPDATE posts SET likes = likes + 1 WHERE id = $1 RETURNING likes`,
    [postId]
  );
  return result.rows[0];
};

// [POST] Dar Unlike
const unlikePost = async (postId) => {
  const result = await db.query(
    `UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = $1 RETURNING likes`,
    [postId]
  );
  return result.rows[0];
};

// --- NOVAS FUNÇÕES DE COMENTÁRIOS ---

// [GET] Obter comentários de um post
const getComments = async (postId) => {
    const result = await db.query(
        'SELECT "user", text FROM comments WHERE post_id = $1 ORDER BY timestamp ASC', 
        [postId]
    );
    return result.rows;
};

// [POST] Criar um comentário
const createComment = async (postId, user, text) => {
    const result = await db.query(
        'INSERT INTO comments (post_id, "user", text) VALUES ($1, $2, $3) RETURNING *', 
        [postId, user, text]
    );
    return result.rows[0];
};

// Exportamos as "receitas"
module.exports = {
  getPersonalizedFeed,
  getGlobalFeed,
  createPost,
  likePost,
  unlikePost,
  getComments,      // <-- Novo
  createComment     // <-- Novo
};