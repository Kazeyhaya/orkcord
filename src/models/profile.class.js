// src/models/profile.class.js
const db = require('./db');

class Profile {
    
    // O "nascimento" de um perfil
    constructor({ user, bio, mood }) { // <-- MUDANÇA: Adicionado 'mood'
        this.user = user;
        this.bio = bio || "Nenhuma bio definida.";
        this.mood = mood || "✨ novo por aqui!"; // <-- MUDANÇA: Adicionado 'mood' com um default
    }

    // --- MÉTODOS DE INSTÂNCIA ---

    // Salva (atualiza) a bio deste perfil na BD
    async save() {
        // "Upsert": Insere se não existir, atualiza se existir
        const result = await db.query(
            // 👇 MUDANÇA: Adicionado 'mood' ao update
            'INSERT INTO profiles ("user", bio, mood) VALUES ($1, $2, $3) ON CONFLICT ("user") DO UPDATE SET bio = $2, mood = $3 RETURNING *',
            [this.user, this.bio, this.mood]
        );
        this.bio = result.rows[0].bio;
        this.mood = result.rows[0].mood; // <-- MUDANÇA: Atualiza o mood no objeto
        return this;
    }

    // (O resto dos teus métodos de instância: follow, unfollow, getFollowing, isFollowing)
    // ... (eles ficam iguais) ...
    async follow(userToFollow) {
        await db.query('INSERT INTO follows (follower_user, following_user) VALUES ($1, $2) ON CONFLICT DO NOTHING', [this.user, userToFollow]);
        return true;
    }
    async unfollow(userToUnfollow) {
        await db.query('DELETE FROM follows WHERE follower_user = $1 AND following_user = $2', [this.user, userToUnfollow]);
        return true;
    }
    async getFollowing() {
        const result = await db.query('SELECT following_user FROM follows WHERE follower_user = $1', [this.user]);
        return result.rows.map(r => r.following_user);
    }
    async isFollowing(userToCheck) {
        const result = await db.query('SELECT 1 FROM follows WHERE follower_user = $1 AND following_user = $2', [this.user, userToCheck]);
        return result.rows.length > 0;
    }

    // --- MÉTODOS ESTÁTICOS ("Fábricas") ---
    
    // Encontra um perfil por nome de utilizador
    static async findByUser(username) {
        // 👇 MUDANÇA: Seleciona 'mood'
        const result = await db.query('SELECT "user", bio, mood FROM profiles WHERE "user" = $1', [username]);
        if (result.rows[0]) {
            return new Profile(result.rows[0]); // Retorna um objeto Profile
        }
        // Se não houver 'bio' na BD, criamos um perfil "virtual"
        return new Profile({ user: username, bio: "Nenhuma bio definida.", mood: "✨ novo por aqui!" });
    }

    // 👇 NOVO MÉTODO ESTÁTICO (Especializado em mudar SÓ o mood)
    static async updateMood(username, newMood) {
        // "Upsert" que afeta apenas o 'mood'
        const result = await db.query(
            'INSERT INTO profiles ("user", mood) VALUES ($1, $2) ON CONFLICT ("user") DO UPDATE SET mood = $2 RETURNING mood',
            [username, newMood]
        );
        return result.rows[0].mood;
    }
}

module.exports = Profile;