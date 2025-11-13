// src/routes/profile.routes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');

// Rotas de Perfil
router.get('/profile/:username', profileController.getProfileBio);
router.post('/profile', profileController.updateProfileBio);

// 👇 NOVA ROTA
router.post('/profile/mood', profileController.updateUserMood);

// Rotas de "Seguir" (Amigos)
router.get('/following/:username', profileController.getFollowingList);
router.get('/isfollowing/:username', profileController.getIsFollowing);
router.post('/follow', profileController.addFollow);
router.post('/unfollow', profileController.removeFollow);

module.exports = router;