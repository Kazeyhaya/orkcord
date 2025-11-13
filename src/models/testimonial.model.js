// src/models/testimonial.model.js
const db = require('./db');

// [GET] Obter todos os depoimentos para um utilizador
const getTestimonials = async (username) => {
    const result = await db.query(
        'SELECT from_user, text FROM testimonials WHERE to_user = $1 ORDER BY timestamp DESC', 
        [username]
    );
    return result.rows;
};

// [POST] Criar um novo depoimento
const createTestimonial = async (fromUser, toUser, text) => {
    const result = await db.query(
        'INSERT INTO testimonials (from_user, to_user, text) VALUES ($1, $2, $3) RETURNING *', 
        [fromUser, toUser, text]
    );
    return result.rows[0];
};

module.exports = {
  getTestimonials,
  createTestimonial
};