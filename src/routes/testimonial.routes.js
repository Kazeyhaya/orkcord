// src/routes/testimonial.routes.js
const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonial.controller');

// [GET] /api/testimonials/:username
// Nota: O caminho aqui é '/:username' porque vamos montar o router em '/api/testimonials'
router.get('/:username', testimonialController.getTestimonialsForUser);

// [POST] /api/testimonials
// Nota: O caminho aqui é '/' porque vamos montar o router em '/api/testimonials'
router.post('/', testimonialController.createNewTestimonial);

module.exports = router;