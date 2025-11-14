// src/routes/profile.routes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const upload = require('../config/storage'); // <-- Importa o nosso 'middleware' de upload

// Rotas de Perfil
router.get('/profile/:username', profileController.getProfileBio);
router.post('/profile', profileController.updateProfileBio);
router.post('/profile/mood', profileController.updateUserMood);

// ROTA DE UPLOAD DE AVATAR
router.post('/profile/avatar', upload.single('avatar'), profileController.updateUserAvatar);

// 👇 --- ADICIONE ESTA LINHA --- 👇
router.post('/profile/rate', profileController.addProfileRating);
// 👆 --- FIM DA LINHA ADICIONADA --- 👆

// Rotas de "Seguir" (Amigos)
router.get('/following/:username', profileController.getFollowingList);
router.get('/isfollowing/:username', profileController.getIsFollowing);
router.post('/follow', profileController.addFollow);
router.post('/unfollow', profileController.removeFollow);

module.exports = router;