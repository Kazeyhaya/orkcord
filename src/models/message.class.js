// src/models/message.class.js
const db = require('./db');

class Message {
    
    constructor({ id, channel, user, message, timestamp, avatar_url }) {
        this.id = id;
        this.channel = channel; // (ex: "alexandre_tsuki")
        this.user = user;
        this.message = message;
        this.timestamp = timestamp || new Date();
        this.avatar_url = avatar_url || null;
    }

    // --- MÉTODOS DE INSTÂNCIA ---
    
    async save() {
        const result = await db.query(
            `INSERT INTO messages (channel, "user", message, timestamp) 
             VALUES ($1, $2, $3, NOW()) 
             RETURNING id, timestamp`,
            [this.channel, this.user, this.message]
        );
        
        this.id = result.rows[0].id;
        this.timestamp = result.rows[0].timestamp;
        
        return this;
    }

    // --- MÉTODOS ESTÁTICOS ("Fábricas") ---
    
    static async getHistory(channelName) {
        const result = await db.query(
            `SELECT m.*, p.avatar_url 
             FROM (
                SELECT * FROM messages 
                WHERE channel = $1 
                ORDER BY timestamp DESC 
                LIMIT 50
             ) AS m
             LEFT JOIN profiles p ON m."user" = p."user"
             ORDER BY m.timestamp ASC`,
            [channelName]
        );
        
        return result.rows.map(row => new Message(row));
    }
}

module.exports = Message;