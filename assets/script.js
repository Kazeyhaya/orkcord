// ===================================================
// 1. ESTADO GLOBAL E REFERÊNCIAS
// ===================================================

// --- Identificação do Usuário ---
const storedUser = localStorage.getItem("agora:user");
let currentUser = storedUser && storedUser.trim() ? storedUser.trim() : null;
if (!currentUser) {
  currentUser = prompt("Digite seu nome de usuário (para o Feed e Chat):");
  if (!currentUser || !currentUser.trim()) currentUser = "Anônimo";
  localStorage.setItem("agora:user", currentUser);
}
// Atualiza a UI com o nome do usuário
document.getElementById("userName").textContent = currentUser;
document.getElementById("profileName").textContent = currentUser;
const userInitial = currentUser.slice(0, 2).toUpperCase();
document.getElementById("userAvatar").textContent = userInitial;
document.getElementById("profileAvatar").textContent = userInitial; // Atualiza avatar do perfil

// "Memória" de Likes: Guarda os IDs dos posts que o usuário curtiu
let likedPostsInSession = new Set();

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
// 2. LÓGICA DO FEED (API / "Agora")
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
  likedPostsInSession.add(postId.toString());
  apiGetPosts(); 
  
  try {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
  } catch (err) {
    console.error("Falha ao dar like:", err);
    likedPostsInSession.delete(postId.toString());
    apiGetPosts(); // Reverte o like
  }
} 

async function apiUnlikePost(postId) {
  likedPostsInSession.delete(postId.toString());
  apiGetPosts();

  try {
    await fetch(`/api/posts/${postId}/unlike`, { method: 'POST' });
  } catch (err) {
    console.error("Falha ao descurtir:", err);
    likedPostsInSession.add(postId.toString());
    apiGetPosts(); // Reverte o unlike
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

    const isLiked = likedPostsInSession.has(post.id.toString()); 

    node.innerHTML = `
      <div class="avatar">${escapeHtml(postUserInitial)}</div>
      <div>
        <div class="meta"><strong>${escapeHtml(post.user)}</strong> • ${postTime}</div>
        <div>${escapeHtml(post.text)}</div>
        <div class="post-actions">
          <button class="mini-btn ${isLiked ? 'liked' : ''}" data-like="${post.id}">
            ❤ ${post.likes || 0}
          </button>
          <button class="mini-btn" data-comment="${post.id}">Comentar</button>
        </div>
        <div class="comments" id="comments-for-${post.id}">
          </div>
      </div>`;
    postsEl.appendChild(node);
    
    apiGetComments(post.id);
  });
}

// --- Funções da API de Comentários ---

// [GET] Pede os comentários de UM post
async function apiGetComments(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments`);
    if (!res.ok) return;
    const data = await res.json();
    renderComments(postId, data.comments || []);
  } catch (err) {
    console.error(`Falha ao buscar comentários para o post ${postId}:`, err);
  }
}

// [POST] Cria um novo comentário
async function apiCreateComment(postId, text) {
  try {
    await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser, text: text })
    });
    apiGetComments(postId); 
  } catch (err) {
    console.error("Falha ao criar comentário:", err);
  }
}

// --- Renderização dos Comentários ---
function renderComments(postId, comments) {
  const container = document.getElementById(`comments-for-${postId}`);
  if (!container) return; 
  
  if (comments.length === 0) {
    container.innerHTML = ""; 
    return;
  }
  
  container.innerHTML = comments.map(item => {
    return `<div class="meta"><strong>${escapeHtml(item.user)}</strong>: ${escapeHtml(item.text)}</div>`;
  }).join(""); 
}

// --- Funções da API do Perfil ---
async function apiGetProfile() {
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(currentUser)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (profileBioEl) profileBioEl.textContent = data.bio;
  } catch (err) {
    console.error("Falha ao buscar bio:", err);
  }
} 

async function apiUpdateBio() {
  const newBio = prompt("Digite sua nova bio:", profileBioEl.textContent);
  if (newBio === null || newBio.trim() === "") return; 

  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser, bio: newBio.trim() })
    });
    if (!res.ok) return;
    const data = await res.json();
    if (profileBioEl) profileBioEl.textContent = data.bio;
  } catch (err) {
    console.error("Falha ao salvar bio:", err);
  }
}

// --- Funções da API de Depoimentos ---
async function apiGetTestimonials() {
  try {
    const res = await fetch(`/api/testimonials/${encodeURIComponent(currentUser)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderTestimonials(data.testimonials || []);
  } catch (err) {
    console.error("Falha ao buscar depoimentos:", err);
  }
}

async function apiCreateTestimonial() {
  const text = testimonialInput.value.trim();
  if (!text) return; 

  testimonialSend.disabled = true;
  try {
    await fetch('/api/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_user: currentUser, 
        to_user: currentUser,   
        text: text
      })
    });
    testimonialInput.value = ""; 
    apiGetTestimonials(); 
  } catch (err) {
    console.error("Falha ao salvar depoimento:", err);
  }
  testimonialSend.disabled = false;
}

// --- Renderização dos Depoimentos ---
function renderTestimonials(testimonials) {
  if (!testimonialsEl) return;
  if (testimonials.length === 0) {
    testimonialsEl.innerHTML = "<div class='meta'>Seja o primeiro a deixar um depoimento!</div>";
    return;
  }
  
  testimonialsEl.innerHTML = ""; // Limpa a lista
  testimonials.forEach(item => {
    const node = document.createElement("div");
    node.className = "meta"; // Reutiliza o estilo 'meta'
    node.innerHTML = `<strong>${escapeHtml(item.from_user)}</strong>: ${escapeHtml(item.text)}`;
    testimonialsEl.appendChild(node);
  });
}

// ===================================================
// 3. LÓGICA DO CHAT (Socket.IO / "Agora")
// ===================================================

// --- Funções do Chat ---
function renderChannel(name) {
  activeChannel = name; 
  chatMessagesEl.innerHTML = ""; 
  
  chatTopicBadge.textContent = `# ${name.replace("-", " ")}`;
  chatInputEl.placeholder = `Envie uma mensagem para #${name}`;
  
  document.querySelectorAll(".channel").forEach(c => c.classList.remove("active"));
  const activeBtn = document.querySelector(`.channel[data-channel="${name}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  socket.emit('joinChannel', { channel: activeChannel, user: currentUser });
}

function addMessageBubble({ user, timestamp, message }) {
  const item = document.createElement("div");
  item.className = "msg";
  const userInitial = (user || "V").slice(0, 2).toUpperCase();
  const time = timestamp ? timestamp.split(' ')[1] : 'agora'; 
  
  // Verifica se o usuário está perto do final do chat
  const isScrolledToBottom = chatMessagesEl.scrollHeight - chatMessagesEl.clientHeight <= chatMessagesEl.scrollTop + 100;

  item.innerHTML = `
    <div class="avatar">${escapeHtml(userInitial)}</div>
    <div class="bubble">
      <div class="meta"><strong>${escapeHtml(user)}</strong> • ${time}</div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
  
  chatMessagesEl.appendChild(item);
  
  // Só rola para baixo se o usuário já estava no final
  if (isScrolledToBottom) {
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
}

function sendChatMessage() {
  const text = chatInputEl.value.trim();
  if (!text) return;

  const messageData = {
    channel: activeChannel,
    user: currentUser, 
    message: text,
    timestamp: new Date().toLocaleString('pt-BR') 
  };
  
  socket.emit('sendMessage', messageData);
  
  chatInputEl.value = "";
  chatInputEl.focus();
}

// ===================================================
// 4. EVENTOS (Conexões dos Botões)
// ===================================================

// --- Eventos do Chat (Socket.IO) ---
chatSendBtn.addEventListener("click", sendChatMessage);
chatInputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChatMessage(); });
channelButtons.forEach(c => c.addEventListener("click", () => renderChannel(c.getAttribute("data-channel"))));

// --- Eventos do Feed (Likes e Comentários) ---
postsEl.addEventListener("click", (e) => {
  // --- Lógica de Like ---
  const likeButton = e.target.closest('[data-like]');
  if (likeButton) {
    const postId = likeButton.dataset.like; 
    if (likeButton.classList.contains('liked')) {
      apiUnlikePost(postId);
    } else {
      apiLikePost(postId);
    }
    return; // Para a execução
  }

  // --- Lógica de Comentário ---
  const commentButton = e.target.closest('[data-comment]');
  if (commentButton) {
    const postId = commentButton.dataset.comment;
    const text = prompt("Digite seu comentário:"); 
    
    if (text && text.trim()) {
      apiCreateComment(postId, text.trim());
    }
    return; // Para a execução
  }
});

// --- Eventos dos Botões do Feed (Publicar e Refresh) ---
// 👇 ESTA É A CORREÇÃO PRINCIPAL 👇
feedSend.addEventListener("click", apiCreatePost);
feedRefreshBtn.addEventListener("click", apiGetPosts);


// --- Evento do Perfil ---
editBioBtn.addEventListener("click", apiUpdateBio);

// --- Evento de Depoimento ---
testimonialSend.addEventListener("click", apiCreateTestimonial);

// --- Eventos das Abas ---
viewTabs.forEach(b => b.addEventListener("click", () => activateView(b.dataset.view)));


// ===================================================
// 5. LÓGICA DE TROCA DE VISÃO (Views) E INICIALIZAÇÃO
// ===================================================

function activateView(name) {
  // 1. Esconde todas as seções
  Object.values(views).forEach(view => view.hidden = true);
  // 2. Mostra a seção correta
  if (views[name]) {
    views[name].hidden = false;
  }
  
  // 3. Atualiza os botões (tabs)
  viewTabs.forEach(b => b.classList.toggle("active", b.dataset.view === name));

  // 4. Ajusta o layout do grid
  appEl.classList.remove("view-feed", "view-chat", "view-profile");
  appEl.classList.add(`view-${name}`);

  if (name === "chat") {
    // Layout de Chat (com canais)
    channelsEl.style.display = "flex";
    if (socket.connected) {
      renderChannel(activeChannel); 
    }
  } else {
    // Layout de Feed/Perfil (sem canais)
    channelsEl.style.display = "none";
  }

  // 5. Carrega os dados da aba
  if (name === "feed") {
    apiGetPosts(); // Carrega os posts ao entrar no feed
  }
  if (name === "profile") {
    apiGetProfile(); // Carrega a bio ao entrar no perfil
    apiGetTestimonials(); // Carrega os depoimentos
  }
}

// --- Segurança ---
function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[m]));
}

// --- Inicialização ---
socket.on('connect', () => {
  console.log('Socket conectado:', socket.id);
  activateView("feed"); // Começa o aplicativo na aba "Feed"
});