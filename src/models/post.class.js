// src/models/post.class.js
const db = require('./db');

class Post {
    
    constructor({ id, user, text, likes, timestamp, avatar_url }) {
        this.id = id;
        this.user = user;
        this.text = text;
        this.likes = likes || 0;
        this.timestamp = timestamp || new Date();
        this.avatar_url = avatar_url || null; 
    }

    // --- MÉTODOS DE INSTÂNCIA (save, addLike, removeLike) ---
    
    async save() {
        if (!this.id) {
            const result = await db.query(
                `INSERT INTO posts ("user", text, timestamp, likes) VALUES ($1, $2, $3, $4) RETURNING *`,
                [this.user, this.text, this.timestamp, this.likes]
            );
            this.id = result.rows[0].id; 
        } else {
            await db.query(
                `UPDATE posts SET "user" = $1, text = $2, likes = $3 WHERE id = $4`,
                [this.user, this.text, this.likes, this.id]
            );
        }
        return this; 
    }

    async addLike() {
        this.likes++; 
        await db.query(`UPDATE posts SET likes = $1 WHERE id = $2`, [this.likes, this.id]);
        return this;
    }

    async removeLike() {
        this.likes = Math.max(0, this.likes - 1); 
        await db.query(`UPDATE posts SET likes = $1 WHERE id = $2`, [this.likes, this.id]);
        return this;
    }


    // --- MÉTODOS ESTÁTICOS ("Fábricas") ---

    static async findById(postId) {
        const result = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
        if (!result.rows[0]) return null;
        
        return new Post(result.rows[0]); 
    }

    static async getPersonalizedFeed(userName) {
        const result = await db.query(
            `SELECT p.*, prof.avatar_url
             FROM posts p
             LEFT JOIN follows f ON p."user" = f.following_user
             LEFT JOIN profiles prof ON p."user" = prof."user"
             WHERE f.follower_user = $1 OR p."user" = $1
             ORDER BY p.timestamp DESC
             LIMIT 30`,
            [userName]
        );
        return result.rows.map(row => new Post(row));
    }
    
    static async getGlobalFeed() {
        const result = await db.query(
            `SELECT p.*, prof.avatar_url
             FROM posts p
             LEFT JOIN profiles prof ON p."user" = prof."user"
             ORDER BY p.timestamp DESC 
             LIMIT 30`
        );
        return result.rows.map(row => new Post(row));
    }

    // --- MÉTODOS ESTÁTICOS PARA COMENTÁRIOS ---

    static async getComments(postId) {
        const result = await db.query(
            'SELECT "user", text FROM comments WHERE post_id = $1 ORDER BY timestamp ASC', 
            [postId]
        );
        return result.rows;
    }

    static async createComment(postId, user, text) {
        const result = await db.query(
            'INSERT INTO comments (post_id, "user", text) VALUES ($1, $2, $3) RETURNING *', 
            [postId, user, text]
        );
        return result.rows[0];
    }
    
    // 👇 NOVO MÉTODO ESTÁTICO ADICIONADO 👇
    static async update(postId, user, newText) {
        // 1. Encontra o post
        const post = await Post.findById(postId);
        if (!post) {
            throw new Error('Post não encontrado');
        }

        // 2. Verifica a autorização
        if (post.user !== user) {
            throw new Error('Não autorizado');
        }

        // 3. Atualiza o post
        const result = await db.query(
            `UPDATE posts SET text = $1 WHERE id = $2 RETURNING *`,
            [newText, postId]
        );
        return new Post(result.rows[0]);
    }
    // 👆 FIM DO NOVO MÉTODO 👆
}

module.exports = Post;