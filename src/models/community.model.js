// src/models/community.model.js
const db = require('./db');

// [GET] Obter comunidades que o utilizador já entrou
const getJoinedCommunities = async (userName) => {
    const result = await db.query(
        'SELECT c.id, c.name, c.emoji FROM communities c JOIN community_members cm ON c.id = cm.community_id WHERE cm.user_name = $1',
        [userName]
    );
    return result.rows;
};

// [GET] Explorar comunidades (onde o utilizador NÃO está)
const getExploreCommunities = async (userName) => {
    const result = await db.query(
        `SELECT c.id, c.name, c.emoji, c.description
         FROM communities c
         WHERE NOT EXISTS (
            SELECT 1 FROM community_members cm WHERE cm.community_id = c.id AND cm.user_name = $1
         )`,
        [userName]
    );
    return result.rows;
};

// [POST] Entrar numa comunidade
const joinCommunity = async (userName, communityId) => {
    // 1. Adiciona o membro
    await db.query('INSERT INTO community_members (user_name, community_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userName, communityId]);
    
    // 2. Atualiza a contagem de membros
    await db.query('UPDATE communities SET members = (SELECT COUNT(*) FROM community_members WHERE community_id = $1) WHERE id = $1', [communityId]);
    
    // 3. Retorna os dados da comunidade para o cliente
    const comm = await db.query('SELECT id, name, emoji FROM communities WHERE id = $1', [communityId]);
    return comm.rows[0];
};

// [POST] Criar uma comunidade nova
const createCommunity = async (name, emoji, creator) => {
    // 1. Criar a comunidade
    const newComm = await db.query(
        'INSERT INTO communities (name, emoji, description, members) VALUES ($1, $2, $3, 1) RETURNING id, name, emoji',
        [name, emoji || '💬', 'Bem-vindo a esta nova comunidade!']
    );
    const newCommunity = newComm.rows[0];
    
    // 2. Adicionar o criador como primeiro membro
    await db.query('INSERT INTO community_members (user_name, community_id) VALUES ($1, $2)', [creator, newCommunity.id]);
    
    return newCommunity;
};

// [GET] Obter os posts (tópicos do fórum) de uma comunidade
const getCommunityPosts = async (communityId) => {
    const result = await db.query(
        'SELECT * FROM community_posts WHERE community_id = $1 ORDER BY timestamp DESC', 
        [communityId]
    );
    return result.rows;
};


module.exports = {
  getJoinedCommunities,
  getExploreCommunities,
  joinCommunity,
  createCommunity,
  getCommunityPosts
};