// src/models/profile.class.js
const db = require('./db');

class Profile {
    
    constructor({ user, bio, mood, avatar_url }) {
        this.user = user;
        this.bio = bio || "Nenhuma bio definida.";
        this.mood = mood || "✨ novo por aqui!";
        this.avatar_url = avatar_url || null;
    }

    // --- MÉTODOS DE INSTÂNCIA ---

    async save() {
        const result = await db.query(
            'INSERT INTO profiles ("user", bio, mood, avatar_url) VALUES ($1, $2, $3, $4) ON CONFLICT ("user") DO UPDATE SET bio = $2, mood = $3, avatar_url = $4 RETURNING *',
            [this.user, this.bio, this.mood, this.avatar_url]
        );
        this.bio = result.rows[0].bio;
        this.mood = result.rows[0].mood;
        this.avatar_url = result.rows[0].avatar_url;
        return this;
    }

    async follow(userToFollow) {
        await db.query('INSERT INTO follows (follower_user, following_user) VALUES ($1, $2) ON CONFLICT DO NOTHING', [this.user, userToFollow]);
        return true;
    }

    async unfollow(userToUnfollow) {
        await db.query('DELETE FROM follows WHERE follower_user = $1 AND following_user = $2', [this.user, userToUnfollow]);
        return true;
    }

    async getFollowing() {
        const result = await db.query(
            `SELECT f.following_user, p.avatar_url 
             FROM follows f
             LEFT JOIN profiles p ON f.following_user = p."user"
             WHERE f.follower_user = $1`, 
            [this.user]
        );
        return result.rows.map(r => ({
            user: r.following_user,
            avatar_url: r.avatar_url
        }));
    }

    async isFollowing(userToCheck) {
        const result = await db.query('SELECT 1 FROM follows WHERE follower_user = $1 AND following_user = $2', [this.user, userToCheck]);
        return result.rows.length > 0;
    }

    // 👇 NOVO MÉTODO (para buscar os votos deste perfil) 👇
    async getRatings() {
        const result = await db.query(
            `SELECT rating_type, COUNT(*) as count 
             FROM profile_ratings 
             WHERE to_user = $1 
             GROUP BY rating_type`,
            [this.user]
        );
        
        // Inicializa os contadores
        const counts = { confiavel: 0, legal: 0, divertido: 0 };
        
        // Preenche com os valores da BD
        for (const row of result.rows) {
            if (counts[row.rating_type] !== undefined) {
                counts[row.rating_type] = parseInt(row.count, 10);
            }
        }
        return counts;
    }
    // 👆 FIM DO NOVO MÉTODO 👆


    // --- MÉTODOS ESTÁTICOS ("Fábricas") ---
    
    static async findByUser(username) {
        const result = await db.query('SELECT * FROM profiles WHERE "user" = $1', [username]);
        if (result.rows[0]) {
            return new Profile(result.rows[0]);
        }
        return new Profile({ user: username });
    }

    static async updateMood(username, newMood) {
        const result = await db.query(
            'INSERT INTO profiles ("user", mood) VALUES ($1, $2) ON CONFLICT ("user") DO UPDATE SET mood = $2 RETURNING mood',
            [username, newMood]
        );
        return result.rows[0].mood;
    }
    
    static async updateAvatar(username, avatarUrl) {
         const result = await db.query(
            'INSERT INTO profiles ("user", avatar_url) VALUES ($1, $2) ON CONFLICT ("user") DO UPDATE SET avatar_url = $2 RETURNING avatar_url',
            [username, avatarUrl]
        );
        return result.rows[0].avatar_url;
    }
    
    // 👇 NOVO MÉTODO (para adicionar um voto) 👇
    static async addRating(fromUser, toUser, ratingType) {
        // Validação básica
        const validTypes = ['confiavel', 'legal', 'divertido'];
        if (!validTypes.includes(ratingType)) {
            throw new Error('Tipo de avaliação inválido');
        }
        
        // 'ON CONFLICT DO NOTHING' garante que um utilizador só pode votar uma vez
        await db.query(
            `INSERT INTO profile_ratings (from_user, to_user, rating_type) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (from_user, to_user, rating_type) DO NOTHING`,
            [fromUser, toUser, ratingType]
        );
        return { success: true };
    }
    // 👆 FIM DO NOVO MÉTODO 👆
}

module.exports = Profile;