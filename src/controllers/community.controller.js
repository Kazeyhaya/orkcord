// src/controllers/community.controller.js
const Community = require('../models/community.model');

// [GET] /api/communities/joined
const getJoined = async (req, res) => {
    try {
        const { user_name } = req.query;
        if (!user_name) return res.status(400).json({ error: 'user_name é obrigatório' });
        
        const communities = await Community.getJoinedCommunities(user_name);
        res.json({ communities });
    } catch (err) {
        console.error("Erro no controlador getJoined:", err);
        res.status(500).json({ error: 'Erro ao buscar comunidades' });
    }
};

// [GET] /api/communities/explore
const getExplore = async (req, res) => {
    try {
        const { user_name } = req.query;
        if (!user_name) return res.status(400).json({ error: 'user_name é obrigatório' });

        const communities = await Community.getExploreCommunities(user_name);
        res.json({ communities });
    } catch (err) {
        console.error("Erro no controlador getExplore:", err);
        res.status(500).json({ error: 'Erro ao explorar comunidades' });
    }
};

// [POST] /api/community/join  (Nota: esta rota é singular 'community')
const join = async (req, res) => {
    try {
        const { user_name, community_id } = req.body;
        if (!user_name || !community_id) {
            return res.status(400).json({ error: 'user_name e community_id são obrigatórios' });
        }
        const community = await Community.joinCommunity(user_name, community_id);
        res.status(201).json({ community });
    } catch (err) {
        console.error("Erro no controlador join:", err);
        res.status(500).json({ error: 'Erro ao entrar na comunidade' });
    }
};

// [POST] /api/communities/create
const create = async (req, res) => {
    try {
        const { name, emoji, creator } = req.body;
        if (!name || !creator) {
            return res.status(400).json({ error: 'Nome e criador são obrigatórios' });
        }
        const community = await Community.createCommunity(name, emoji, creator);
        res.status(201).json({ community });
    } catch (err) {
        console.error("Erro no controlador create:", err);
        res.status(500).json({ error: 'Erro ao criar comunidade' });
    }
};

// [GET] /api/community/:id/posts (Nota: esta rota é singular 'community')
const getPosts = async (req, res) => {
    try {
        const { id } = req.params;
        const posts = await Community.getCommunityPosts(id);
        res.json({ posts });
    } catch (err) {
        console.error("Erro no controlador getPosts:", err);
        res.status(500).json({ error: 'Erro ao buscar posts da comunidade' });
    }
};

module.exports = {
  getJoined,
  getExplore,
  join,
  create,
  getPosts
};