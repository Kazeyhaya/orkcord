const express = require('express');
const {
	listPosts,
	createPost,
	likePost,
	commentPost,
	getProfile,
	updateBio,
	addTestimonial
} = require('../store');

const router = express.Router();

// Feed
router.get('/posts', (_req, res) => {
	res.json({ posts: listPosts() });
});

router.post('/posts', (req, res) => {
	const user = String(req.body.user || '').trim();
	const text = String(req.body.text || '').trim();
	if (!user || !text) return res.status(400).json({ error: 'user and text required' });
	const post = createPost({ user, text });
	res.status(201).json(post);
});

router.post('/posts/:id/like', (req, res) => {
	const likes = likePost(req.params.id);
	if (likes == null) return res.status(404).json({ error: 'not found' });
	res.json({ likes });
});

router.post('/posts/:id/comment', (req, res) => {
	const user = String(req.body.user || '').trim();
	const text = String(req.body.text || '').trim();
	if (!user || !text) return res.status(400).json({ error: 'user and text required' });
	const comment = commentPost(req.params.id, { user, text });
	if (!comment) return res.status(404).json({ error: 'not found' });
	res.status(201).json(comment);
});

// Perfil
router.get('/profile', (_req, res) => {
	res.json(getProfile());
});

router.patch('/profile/bio', (req, res) => {
	const bio = String(req.body.bio || '').trim();
	if (!bio) return res.status(400).json({ error: 'bio required' });
	res.json({ bio: updateBio(bio) });
});

router.get('/testimonials', (_req, res) => {
	const { testimonials, friends } = getProfile();
	res.json({ testimonials, friends });
});

router.post('/testimonials', (req, res) => {
	const user = String(req.body.user || '').trim();
	const text = String(req.body.text || '').trim();
	if (!user || !text) return res.status(400).json({ error: 'user and text required' });
	const t = addTestimonial({ user, text });
	res.status(201).json(t);
});

module.exports = router;


