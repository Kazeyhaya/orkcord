// src/controllers/profile.controller.js
const Profile = require('../models/profile.class'); // Importa a Classe

// [GET] /api/profile/:username
const getProfileBio = async (req, res) => {
    try {
        const { username } = req.params;
        const profile = await Profile.findByUser(username);
        // 👇 MUDANÇA: Agora retorna o objeto profile inteiro (com bio e mood)
        res.json(profile); 
    } catch (err) {
        console.error("Erro no controlador getProfileBio:", err);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
};

// [POST] /api/profile
const updateProfileBio = async (req, res) => {
    try {
        const { user, bio } = req.body;
        if (!user || bio === undefined) {
            return res.status(400).json({ error: 'Utilizador e bio são obrigatórios' });
        }
        
        const profile = await Profile.findByUser(user);
        profile.bio = bio; // Modifica a bio
        await profile.save(); // Salva (isto também salva o mood atual)
        
        res.status(200).json(profile);
    } catch (err) {
        console.error("Erro no controlador updateProfileBio:", err);
        res.status(500).json({ error: 'Erro ao atualizar bio' });
    }
};

// 👇 NOVA FUNÇÃO (Controlador para o Mood)
// [POST] /api/profile/mood
const updateUserMood = async (req, res) => {
    try {
        const { user, mood } = req.body;
        if (!user || mood === undefined) {
            return res.status(400).json({ error: 'Utilizador e mood são obrigatórios' });
        }
        // Usamos o nosso novo método estático super eficiente
        const newMood = await Profile.updateMood(user, mood);
        res.status(200).json({ mood: newMood });
    } catch (err) {
        console.error("Erro no controlador updateUserMood:", err);
        res.status(500).json({ error: 'Erro ao atualizar mood' });
    }
};

// (O resto dos teus controladores: getFollowingList, getIsFollowing, addFollow, removeFollow)
// ... (ficam iguais) ...
const getFollowingList = async (req, res) => {
    try {
        const { username } = req.params;
        const profile = await Profile.findByUser(username); // 1. Encontra
        const followingList = await profile.getFollowing(); // 2. Pede-lhe a lista
        
        res.json({ following: followingList });
    } catch (err) {
        console.error("Erro no controlador getFollowingList:", err);
        res.status(500).json({ error: 'Erro ao buscar amigos' });
    }
};
const getIsFollowing = async (req, res) => {
    try {
        const { username: userToCheck } = req.params; // Quem o utilizador está a ver
        const { follower: currentUsername } = req.query; // O utilizador atual
        
        if (!currentUsername) {
            return res.status(400).json({ error: "Follower não especificado" });
        }
        const profile = await Profile.findByUser(currentUsername); // 1. Encontra o perfil do utilizador ATUAL
        const isFollowing = await profile.isFollowing(userToCheck); // 2. Pergunta-lhe se ele segue o outro
        
        res.json({ isFollowing });
    } catch (err) {
        console.error("Erro no controlador getIsFollowing:", err);
        res.status(500).json({ error: 'Erro ao verificar' });
    }
};
const addFollow = async (req, res) => {
    try {
        const { follower, following } = req.body;
        if (!follower || !following) {
            return res.status(400).json({ error: 'Follower e Following são obrigatórios' });
        }
        
        const profile = await Profile.findByUser(follower); // 1. Encontra o perfil
        await profile.follow(following); // 2. Diz-lhe para seguir
        
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Erro no controlador addFollow:", err);
        res.status(500).json({ error: 'Erro ao seguir' });
    }
};
const removeFollow = async (req, res) => {
    try {
        const { follower, following } = req.body;
        if (!follower || !following) {
            return res.status(400).json({ error: 'Follower e Following são obrigatórios' });
        }
        
        const profile = await Profile.findByUser(follower); // 1. Encontra o perfil
        await profile.unfollow(following); // 2. Diz-lhe para deixar de seguir
        
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erro no controlador removeFollow:", err);
        res.status(500).json({ error: 'Erro ao deixar de seguir' });
    }
};


module.exports = {
  getProfileBio,
  updateProfileBio,
  updateUserMood, // <-- MUDANÇA: Exporta a nova função
  getFollowingList,
  getIsFollowing,
  addFollow,
  removeFollow
};