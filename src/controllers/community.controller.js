// src/controllers/community.controller.js
const Community = require('../models/community.class');

// ... (getJoined, getExplore, join, create, getPosts, getMembers, getDetails, updateDetails... continuam iguais) ...
// [GET] /api/communities/joined
const getJoined = async (req, res) => {
    try {
        const { user_name } = req.query;
        if (!user_name) return res.status(400).json({ error: 'user_name é obrigatório' });
        
        const communities = await Community.findJoined(user_name);
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

        const communities = await Community.findExplore(user_name);
        res.json({ communities });
    } catch (err) {
        console.error("Erro no controlador getExplore:", err);
        res.status(500).json({ error: 'Erro ao explorar comunidades' });
    }
};

// [POST] /api/community/join
const join = async (req, res) => {
    try {
        const { user_name, community_id } = req.body;
        if (!user_name || !community_id) {
            return res.status(400).json({ error: 'user_name e community_id são obrigatórios' });
        }
        
        const community = await Community.findById(community_id);
        if (!community) {
            return res.status(404).json({ error: 'Comunidade não encontrada' });
        }
        
        await community.addMember(user_name);
        
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
        if (name.length > 50) {
            return res.status(400).json({ error: 'O nome da comunidade não pode exceder 50 caracteres.' });
        }
        if (emoji && emoji.length > 5) {
             return res.status(400).json({ error: 'O emoji é muito longo.' });
        }
        
        const community = await Community.create(name, emoji, creator);
        
        res.status(201).json({ community });
    } catch (err) {
        console.error("Erro no controlador create:", err);
        res.status(500).json({ error: 'Erro ao criar comunidade' });
    }
};

// [GET] /api/community/:id/posts
const getPosts = async (req, res) => {
    try {
        const { id } = req.params;
        
        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({ error: 'Comunidade não encontrada' });
        }
        
        const posts = await community.getPosts();
        
        res.json({ posts });
    } catch (err) {
        console.error("Erro no controlador getPosts:", err);
        res.status(500).json({ error: 'Erro ao buscar posts da comunidade' });
    }
};

// [GET] /api/community/:id/members
const getMembers = async (req, res) => {
    try {
        const { id } = req.params;
        
        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({ error: 'Comunidade não encontrada' });
        }
        
        const members = await community.getMembers();
        
        res.json({ members });
    } catch (err) {
        console.error("Erro no controlador getMembers:", err);
        res.status(500).json({ error: 'Erro ao buscar membros da comunidade' });
    }
};

// [GET] /api/community/:id/details
const getDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({ error: 'Comunidade não encontrada' });
        }
        res.json({ community }); 
    } catch (err) {
        console.error("Erro no controlador getDetails:", err);
        res.status(500).json({ error: 'Erro ao buscar detalhes da comunidade' });
    }
};

// [POST] /api/community/:id/update
const updateDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, emoji, user } = req.body; 

        if (!name || !user) {
            return res.status(400).json({ error: 'Nome e utilizador são obrigatórios' });
        }

        const community = await Community.findById(id);
        if (!community) {
            return res.status(404).json({ error: 'Comunidade não encontrada' });
        }

        if (community.owner_user !== user) {
            return res.status(403).json({ error: 'Apenas o dono pode editar a comunidade.' });
        }
        
        const updatedCommunity = await Community.updateDetails(id, name, emoji || '💬');
        
        res.json({ community: updatedCommunity });
    } catch (err) {
        console.error("Erro no controlador updateDetails:", err);
        res.status(500).json({ error: 'Erro ao atualizar comunidade' });
    }
};

// 👇 NOVO CONTROLADOR ADICIONADO 👇
// [POST] /api/community/posts (Criar Tópico)
const createCommunityPost = async (req, res) => {
    try {
        const { community_id, user, title, content } = req.body;

        // Validação
        if (!community_id || !user || !title || !content) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }
        if (title.length > 100) {
            return res.status(400).json({ error: 'O título não pode exceder 100 caracteres.' });
        }

        // 1. Verifica se a comunidade existe
        const community = await Community.findById(community_id);
        if (!community) {
            return res.status(404).json({ error: 'Comunidade não encontrada' });
        }

        // 2. Cria o post
        const newPost = await Community.createPost(community_id, user, title, content);
        
        res.status(201).json({ post: newPost });
    } catch (err) {
        console.error("Erro no controlador createCommunityPost:", err);
        res.status(500).json({ error: 'Erro ao criar tópico na comunidade' });
    }
};
// 👆 FIM DO NOVO CONTROLADOR 👆


module.exports = {
  getJoined,
  getExplore,
  join,
  create,
  getPosts,
  getMembers,
  getDetails,
  updateDetails,
  createCommunityPost // <-- Exporta o novo controlador
};