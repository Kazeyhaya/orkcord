// src/models/community.class.js
const db = require('./db');

class Community {
    
    // Adicionado 'owner_user'
    constructor({ id, name, description, emoji, members, owner_user }) {
        this.id = id;
        this.name = name;
        this.description = description || "Bem-vindo a esta comunidade!";
        this.emoji = emoji || '💬';
        this.members = members || 0;
        this.owner_user = owner_user || null; // O dono da comunidade
    }

    // --- MÉTODOS DE INSTÂNCIA ---

    // Adicionado 'owner_user'
    async save() {
        const result = await db.query(
            'INSERT INTO communities (name, emoji, description, members, owner_user) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [this.name, this.emoji, this.description, this.members, this.owner_user]
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
    
    async getPosts() {
        const result = await db.query(
            `SELECT cp.*, p.avatar_url 
             FROM community_posts cp
             LEFT JOIN profiles p ON cp."user" = p."user"
             WHERE cp.community_id = $1 
             ORDER BY cp.timestamp DESC`, 
            [this.id]
        );
        return result.rows;
    }

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
    
    // (Este método era 'createCommunity' no modelo antigo, agora está na Classe)
    static async create(name, emoji, creator) {
        // 1. Criar a comunidade
        const community = new Community({
            name: name,
            emoji: emoji || '💬',
            members: 1,
            owner_user: creator // Define o criador como o dono
        });
        await community.save(); // Salva e obtém o ID
        
        // 2. Adicionar o criador como primeiro membro
        await community.addMember(creator);
        
        return community;
    }
}

module.exports = Community;