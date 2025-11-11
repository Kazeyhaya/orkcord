// Armazenamento em memória (demo). Em produção, trocar por Postgres/Mongo.
const { randomUUID } = require('crypto');

const memory = {
	posts: [
		{ id: randomUUID(), user: 'Ana', text: 'Primeiro post no OrkCord! 💖', ts: Date.now()-600000, likes: 2, comments: [{ user: 'Bruno', text: '🔥' }] },
	],
	profile: {
		bio: 'Apaixonado por comunidades e bate-papo.',
		friends: ['Ana', 'Bruno', 'Carol', 'Diego', 'Eva', 'Felipe'],
		testimonials: []
	}
};

function listPosts() {
	return memory.posts;
}
function createPost({ user, text }) {
	const item = { id: randomUUID(), user, text, ts: Date.now(), likes: 0, comments: [] };
	memory.posts.push(item);
	return item;
}
function likePost(id) {
	const p = memory.posts.find(x => x.id === id);
	if (!p) return null;
	p.likes = (p.likes || 0) + 1;
	return p.likes;
}
function commentPost(id, { user, text }) {
	const p = memory.posts.find(x => x.id === id);
	if (!p) return null;
	p.comments = p.comments || [];
	p.comments.push({ user, text });
	return p.comments.slice(-1)[0];
}

function getProfile() {
	return memory.profile;
}
function updateBio(bio) {
	memory.profile.bio = bio;
	return memory.profile.bio;
}
function addTestimonial({ user, text }) {
	memory.profile.testimonials.push({ user, text, ts: Date.now() });
	return memory.profile.testimonials.slice(-1)[0];
}

module.exports = {
	listPosts,
	createPost,
	likePost,
	commentPost,
	getProfile,
	updateBio,
	addTestimonial
};


