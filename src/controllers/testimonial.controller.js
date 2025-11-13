// src/controllers/testimonial.controller.js
const Testimonial = require('../models/testimonial.model');

// [GET] /api/testimonials/:username
const getTestimonialsForUser = async (req, res) => {
    try {
        const { username } = req.params;
        const testimonials = await Testimonial.getTestimonials(username);
        res.json({ testimonials });
    } catch (err) {
        console.error("Erro no controlador getTestimonialsForUser:", err);
        res.status(500).json({ error: 'Erro ao buscar depoimentos' });
    }
};

// [POST] /api/testimonials
const createNewTestimonial = async (req, res) => {
    try {
        const { from_user, to_user, text } = req.body;
        if (!from_user || !to_user || !text) {
            return res.status(400).json({ error: 'Todos os campos (from_user, to_user, text) são obrigatórios' });
        }
        const newTestimonial = await Testimonial.createTestimonial(from_user, to_user, text);
        res.status(201).json(newTestimonial);
    } catch (err) {
        console.error("Erro no controlador createNewTestimonial:", err);
        res.status(500).json({ error: 'Erro ao criar depoimento' });
    }
};

module.exports = {
  getTestimonialsForUser,
  createNewTestimonial
};