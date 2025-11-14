// src/models/community.class.js
const db = require('./db');

class Community {
    
    constructor({ id, name, description, emoji, members }) {
        this.id = id;
        this.name = name;
        this.description = description || "Bem-vindo a esta comunidade!";
        this.emoji = emoji || '💬';
        this.members = members || 0;
    }

    // --- MÉTODOS DE INSTÂNCIA ---

    async save() {
        const result = await db.query(
            'INSERT INTO communities (name, emoji, description, members) VALUES ($1, $2, $3, $4) RETURNING *',
            [this.name, this.emoji, this.description, this.members]
        );
        this.id = result.rows[0].id;
        return this;
    }

    async addMember(userName) {
        await db.query('INSERT INTO community_members (user_name, community_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userName, this.id]);
        
        const countResult = await db.query('SELECT COUNT(*) FROM community_members WHERE community_id = $1', [this.id]);
        this.members = parseInt(countResult.rows[0].count, 10);

        await db.query('UPDATE communities SET members = $1 WHERE id = $2', [this.members, this.id]);
        return this;
    }
    
    // 👇 MUDANÇA AQUI (Query com LEFT JOIN) 👇
    // Obtém os posts desta comunidade (this.id)
    async getPosts() {
        const result = await db.query(
            `SELECT cp.*, p.avatar_url 
             FROM community_posts cp
             LEFT JOIN profiles p ON cp."user" = p."user"
             WHERE cp.community_id = $1 
             ORDER BY cp.timestamp DESC`, 
            [this.id]
        );
        return result.rows; // Agora inclui 'avatar_url'
    }
    // 👆 FIM DA MUDANÇA 👆

    // --- MÉTODOS ESTÁTICOS ("Fábricas") ---

    static async findById(id) {
        const result = await db.query('SELECT * FROM communities WHERE id = $1', [id]);
        if (!result.rows[0]) return null;
        return new Community(result.rows[0]);
    }

    static async findJoined(userName) {
        const result = await db.query(
            'SELECT c.* FROM communities c JOIN community_members cm ON c.id = cm.community_id WHERE cm.user_name = $1',
            [userName]
        );
        return result.rows.map(row => new Community(row));
    }

    static async findExplore(userName) {
        const result = await db.query(
            `SELECT c.* FROM communities c
             WHERE NOT EXISTS (
                SELECT 1 FROM community_members cm WHERE cm.community_id = c.id AND cm.user_name = $1
             )`,
            [userName]
        );
        return result.rows.map(row => new Community(row));
    }
}

module.exports = Community;