// src/routes/api.routes.test.js
const request = require('supertest');
const express = require('express');
const { Server } = require('socket.io');

// --- Mocks ---
jest.mock('../models/db', () => ({
  setupDatabase: jest.fn(() => Promise.resolve(true)), 
  query: jest.fn(),
}));
jest.mock('socket.io', () => ({
  Server: jest.fn(() => ({
    on: jest.fn(), 
  })),
}));
jest.mock('../socket/chat.handler', () => ({
  initializeSocket: jest.fn(), 
}));
// --- Fim dos Mocks ---


// 👇 MUDANÇA: Importamos o 'app' (express) em vez do 'server' (http)
const app = require('../server'); 


describe('Testes de Integração da API', () => {

  it('GET /api/posts/explore - deve retornar 200 OK (Teste de Rota Pública)', async () => {
    
    const mockPosts = [{ user: 'Teste', text: 'Olá' }];
    const Post = require('../models/post.class');
    Post.getGlobalFeed = jest.fn().mockResolvedValue(mockPosts);

    // Usamos o 'app' aqui
    const response = await request(app)
      .get('/api/posts/explore')
      .expect('Content-Type', /json/) 
      .expect(200); 

    expect(response.body.posts).toEqual(mockPosts);
  });

  it('POST /api/profile/mood - deve validar (falhar) se o mood for muito longo', async () => {
    
    const longMood = 'Este mood tem mais de 30 caracteres, com certeza.';
    
    const response = await request(app)
      .post('/api/profile/mood')
      .send({ user: 'Alexandre', mood: longMood }) 
      .expect('Content-Type', /json/)
      .expect(400); 

    expect(response.body.error).toContain('30 caracteres');
  });

  it('GET /api/profile/Inexistente - deve retornar um perfil "virtual"', async () => {
    
    const db = require('../models/db');
    db.query.mockResolvedValue({ rows: [] }); 

    const response = await request(app)
      .get('/api/profile/Inexistente')
      .expect(200);

    expect(response.body.user).toBe('Inexistente');
    expect(response.body.bio).toBe('Nenhuma bio definida.');
  });
  
});

//  MUDANÇA: Removemos o 'afterAll'
// O Supertest trata de fechar o servidor quando lhe passamos o 'app'.