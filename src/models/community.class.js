// src/models/community.class.js
const db = require('./db');

class Community {
    
    constructor({ id, name, description, emoji, members, owner_user }) {
        this.id = id;
        this.name = name;
        this.description = description || "Bem-vindo a esta comunidade!";
        this.emoji = emoji || '💬';
        this.members = members || 0;
        this.owner_user = owner_user || null; 
    }

    // --- MÉTODOS DE INSTÂNCIA ---
    async save() {
        if (!this.id) {
            const result = await db.query(
                'INSERT INTO communities (name, emoji, description, members, owner_user) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [this.name, this.emoji, this.description, this.members, this.owner_user]
            );
            this.id = result.rows[0].id;
        } else {
             await db.query(
                'UPDATE communities SET name = $1, emoji = $2, description = $3 WHERE id = $4',
                [this.name, this.emoji, this.description, this.id]
            );
        }
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

    async getMembers() {
        const result = await db.query(
            `SELECT cm.user_name, p.avatar_url
             FROM community_members cm
             LEFT JOIN profiles p ON cm.user_name = p."user"
             WHERE cm.community_id = $1
             ORDER BY cm.timestamp ASC`,
            [this.id]
        );
        return result.rows.map(row => ({
            user: row.user_name,
            avatar_url: row.avatar_url
        }));
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
    
    static async create(name, emoji, creator) {
        const community = new Community({
            name: name,
            emoji: emoji || '💬',
            members: 1,
            owner_user: creator
        });
        await community.save();
        await community.addMember(creator);
        return community;
    }
    
    static async updateDetails(communityId, newName, newEmoji) {
        const result = await db.query(
            'UPDATE communities SET name = $1, emoji = $2 WHERE id = $3 RETURNING *',
            [newName, newEmoji, communityId]
        );
        return new Community(result.rows[0]);
    }
    
    // 👇 NOVO MÉTODO ESTÁTICO ADICIONADO 👇
    static async createPost(communityId, user, title, content) {
        const result = await db.query(
            `INSERT INTO community_posts (community_id, "user", title, content) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [communityId, user, title, content]
        );
        return result.rows[0];
    }
    // 👆 FIM DO NOVO MÉTODO 👆
}

module.exports = Community;