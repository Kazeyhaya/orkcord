// src/models/profile.model.js
const db = require('./db');

// [GET] Obter a bio de um perfil
const getProfile = async (username) => {
    const result = await db.query('SELECT bio FROM profiles WHERE "user" = $1', [username]);
    // Retorna a bio, ou um texto padrão se não existir
    return result.rows[0]?.bio || "Nenhuma bio definida.";
};

// [POST] Atualizar a bio (Insere ou Atualiza)
const updateProfile = async (user, bio) => {
    const result = await db.query(
      'INSERT INTO profiles ("user", bio) VALUES ($1, $2) ON CONFLICT ("user") DO UPDATE SET bio = $2 RETURNING bio',
      [user, bio]
    );
    return result.rows[0];
};

// [GET] Obter a lista de quem um utilizador segue (Amigos)
const getFollowing = async (username) => {
    const result = await db.query('SELECT following_user FROM follows WHERE follower_user = $1', [username]);
    // Transforma a resposta do DB [{following_user: 'ana'}, ...] para ['ana', ...]
    return result.rows.map(r => r.following_user);
};

// [GET] Verificar se um utilizador segue outro
const checkFollowing = async (follower, following) => {
    const result = await db.query('SELECT 1 FROM follows WHERE follower_user = $1 AND following_user = $2', [follower, following]);
    return result.rows.length > 0;
};

// [POST] Seguir um utilizador
const followUser = async (follower, following) => {
    // ON CONFLICT DO NOTHING ignora se a relação já existir
    await db.query('INSERT INTO follows (follower_user, following_user) VALUES ($1, $2) ON CONFLICT DO NOTHING', [follower, following]);
    return { success: true };
};

// [POST] Deixar de seguir um utilizador
const unfollowUser = async (follower, following) => {
    await db.query('DELETE FROM follows WHERE follower_user = $1 AND following_user = $2', [follower, following]);
    return { success: true };
};

module.exports = {
  getProfile,
  updateProfile,
  getFollowing,
  checkFollowing,
  followUser,
  unfollowUser
};