// src/controllers/profile.controller.js
const Profile = require('../models/profile.model');

// [GET] /api/profile/:username
const getProfileBio = async (req, res) => {
    try {
        const { username } = req.params;
        const bio = await Profile.getProfile(username);
        res.json({ bio });
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
        const updatedProfile = await Profile.updateProfile(user, bio);
        res.status(200).json(updatedProfile);
    } catch (err) {
        console.error("Erro no controlador updateProfileBio:", err);
        res.status(500).json({ error: 'Erro ao atualizar bio' });
    }
};

// [GET] /api/following/:username
const getFollowingList = async (req, res) => {
    try {
        const { username } = req.params;
        const followingList = await Profile.getFollowing(username);
        res.json({ following: followingList });
    } catch (err) {
        console.error("Erro no controlador getFollowingList:", err);
        res.status(500).json({ error: 'Erro ao buscar amigos' });
    }
};

// [GET] /api/isfollowing/:username (O que corrige o botão "Erro")
const getIsFollowing = async (req, res) => {
    try {
        const { username } = req.params; // Quem o utilizador está a ver
        const { follower } = req.query; // O utilizador atual
        if (!follower) {
            return res.status(400).json({ error: "Follower não especificado" });
        }
        const isFollowing = await Profile.checkFollowing(follower, username);
        res.json({ isFollowing });
    } catch (err) {
        console.error("Erro no controlador getIsFollowing:", err);
        res.status(500).json({ error: 'Erro ao verificar' });
    }
};

// [POST] /api/follow
const addFollow = async (req, res) => {
    try {
        const { follower, following } = req.body;
        if (!follower || !following) {
            return res.status(400).json({ error: 'Follower e Following são obrigatórios' });
        }
        const result = await Profile.followUser(follower, following);
        res.status(201).json(result);
    } catch (err) {
        console.error("Erro no controlador addFollow:", err);
        res.status(500).json({ error: 'Erro ao seguir' });
    }
};

// [POST] /api/unfollow
const removeFollow = async (req, res) => {
    try {
        const { follower, following } = req.body;
        if (!follower || !following) {
            return res.status(400).json({ error: 'Follower e Following são obrigatórios' });
        }
        const result = await Profile.unfollowUser(follower, following);
        res.status(200).json(result);
    } catch (err) {
        console.error("Erro no controlador removeFollow:", err);
        res.status(500).json({ error: 'Erro ao deixar de seguir' });
    }
};

module.exports = {
  getProfileBio,
  updateProfileBio,
  getFollowingList,
  getIsFollowing,
  addFollow,
  removeFollow
};