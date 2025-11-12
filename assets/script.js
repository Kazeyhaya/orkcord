// ===================================================
// 1. ESTADO GLOBAL E REFERÊNCIAS
// ===================================================

// --- Identificação do Usuário ---
const storedUser = localStorage.getItem("orkcord:user");
let currentUser = storedUser && storedUser.trim() ? storedUser.trim() : null;
if (!currentUser) {
  currentUser = prompt("Digite seu nome de usuário (para o Feed e Chat):");
  if (!currentUser || !currentUser.trim()) currentUser = "Anônimo";
  localStorage.setItem("orkcord:user", currentUser);
}
// Atualiza a UI com o nome do usuário
document.getElementById("userName").textContent = currentUser;
document.getElementById("profileName").textContent = currentUser;
const userInitial = currentUser.slice(0, 2).toUpperCase();
document.getElementById("userAvatar").textContent = userInitial;
document.getElementById("profileAvatar").textContent = userInitial; // Atualiza avatar do perfil

// --- Referências do Chat ---
const chatMessagesEl = document.getElementById("messages");
const chatTopicBadge = document.getElementById("topic");
const chatInputEl = document.getElementById("composerInput");
const chatSendBtn = document.getElementById("sendBtn");
const channelButtons = document.querySelectorAll(".channel[data-channel]");
let activeChannel = "geral"; // Canal de chat padrão

// --- Referências do Feed ---
const postsEl = document.getElementById("posts");
const feedInput = document.getElementById("feedInput");
const feedSend = document.getElementById("feedSend");
const feedRefreshBtn = document.getElementById("btn-refresh");

// --- Referências do Perfil ---
const profileBioEl = document.getElementById("profileBio");
const editBioBtn = document.getElementById("editBioBtn");

// --- Referências dos Depoimentos ---
const testimonialsEl = document.getElementById("testimonials");
const testimonialInput = document.getElementById("testimonialInput");
const testimonialSend = document.getElementById("testimonialSend");

// --- Referências de Visão (Views) ---
const appEl = document.querySelector(".app");
const channelsEl = document.querySelector(".channels");
const viewTabs = document.querySelectorAll(".view-tabs .pill");
const views = {
  feed: document.getElementById("view-feed"),
  chat: document.getElementById("view-chat"),
  profile: document.getElementById("view-profile")
};

// --- Conexão Socket.IO (Só para o Chat) ---
const socket = io();

// ===================================================
// 2. LÓGICA DO FEED (API / "Orkut")
// ===================================================

// --- Funções da API do Feed ---
async function apiGetPosts() {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) return;
    const data = await response.json();
    renderPosts(data.posts || []);
  } catch (err) {
    console.error("Falha ao buscar posts:", err);
    postsEl.innerHTML = "<div class='meta'>Falha ao carregar posts.</div>";
  }
}

async function apiCreatePost() {
  const text = feedInput.value.trim();
  if (!text) return;

  feedSend.disabled = true; // Desabilita botão
  try {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser, text: text })
    });
    feedInput.value = ""; // Limpa o input
    apiGetPosts(); // Atualiza o feed
  } catch (err) {
    console.error("Falha ao criar post:", err);
  }
  feedSend.disabled = false; // Re-abilita botão
}

async function apiLikePost(postId) {
  try {
    // Chama a nova rota que criamos no backend
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    
    // Atualiza o feed inteiro para mostrar o novo like
    apiGetPosts(); 

  } catch (err) {
    console.error("Falha ao dar like:", err);
  }
} 

// --- Renderização do Feed ---
function renderPosts(posts) {
  if (!postsEl) return;
  if (posts.length === 0) {
    postsEl.innerHTML = "<div class='meta' style='padding: 12px;'>Ainda não há posts. Seja o primeiro!</div>";
    return;
  }
  
  postsEl.innerHTML = ""; // Limpa antes de renderizar
  posts.forEach(post => {
    const node = document.createElement("div");
    node.className = "post";
    const postUserInitial = (post.user || "?").slice(0, 2).toUpperCase();
    const postTime = new Date(post.timestamp).toLocaleString('pt-BR');

    node.innerHTML = `
      <div class="avatar">${escapeHtml(postUserInitial)}</div>
      <div>
        <div class="meta"><strong>${escapeHtml(post.user)}</strong> • ${postTime}</div>
        <div>${escapeHtml(post.text)}</div>
        <div class="post-actions">
          <button class="mini-btn" data-like="${post.id}">❤ ${post.likes || 0}</button>
          <button class="mini-btn" data-comment="${post.id}">Comentar</button>
        </div>
        <div class="comments">
          </div>
      </div>`;
    postsEl.appendChild(node);
  });
}

// --- Eventos do Feed ---
feedSend.addEventListener("click", apiCreatePost);
feedRefreshBtn.addEventListener("click", apiGetPosts);
feedInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") apiCreatePost();
});

// "Ouvinte" de cliques para a área de posts (pega os cliques nos botões de Like)
postsEl.addEventListener("click", (e) => {
  // Verifica se o que clicamos foi um botão com o atributo 'data-like'
  if (e.target.matches('[data-like]')) {
    const postId =