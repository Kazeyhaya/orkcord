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
document.getElementById("userName").textContent = currentUser;
const userInitial = currentUser.slice(0, 2).toUpperCase();
document.getElementById("userAvatar").textContent = userInitial;

// --- Estado da UI ---
let activeChannel = "geral"; 
let viewedUsername = currentUser; 

// --- Referências do Chat ---
const chatMessagesEl = document.getElementById("messages");
const chatTopicBadge = document.getElementById("topic");
const chatInputEl = document.getElementById("composerInput");
const chatSendBtn = document.getElementById("sendBtn");
const channelButtons = document.querySelectorAll(".channel[data-channel]");

// --- Referências do Feed (Pessoal) ---
const postsEl = document.getElementById("posts");
const feedInput = document.getElementById("feedInput");
const feedSend = document.getElementById("feedSend");
const feedRefreshBtn = document.getElementById("btn-refresh");

// --- Referências do Feed (Explorar) ---
const explorePostsEl = document.getElementById("explore-posts");
const btnExplore = document.getElementById("btn-explore");
const btnExploreRefresh = document.getElementById("btn-explore-refresh");

// --- Referências do Perfil ---
const profileAvatarEl = document.getElementById("profileAvatar");
const profileNameEl = document.getElementById("profileName");
const profileBioEl = document.getElementById("profileBio");
const editBioBtn = document.getElementById("editBioBtn");
const userbarMeBtn = document.getElementById("userbar-me"); // 👈 NOVO

// --- Referências dos Depoimentos ---
const testimonialsEl = document.getElementById("testimonials");
const testimonialInput = document.getElementById("testimonialInput");
const testimonialSend = document.getElementById("testimonialSend");

// --- Referências de Visão (Views) ---
const appEl = document.querySelector(".app");
const channelsEl = document.querySelector(".channels");
// O botão "Perfil" já não existe, este querySelector está correto
const viewTabs = document.querySelectorAll(".view-tabs .pill"); 
const views = {
  feed: document.getElementById("view-feed"),
  chat: document.getElementById("view-chat"),
  profile: document.getElementById("view-profile"),
  explore: document.getElementById("view-explore") 
};

// --- Conexão Socket.IO (Só para o Chat) ---
const socket = io();

// ===================================================
// 2. LÓGICA DO FEED (API / "Agora")
// ===================================================

// --- Funções da API do Feed (Pessoal) ---
async function apiGetPosts() {
  try {
    const response = await fetch(`/api/posts?user=${encodeURIComponent(currentUser)}`);
    if (!response.ok) return;
    const data = await response.json();
    renderPosts(data.posts || []); // Renderiza no feed pessoal
  } catch (err) {
    console.error("Falha ao buscar posts:", err);
    postsEl.innerHTML = "<div class='meta'>Falha ao carregar posts.</div>";
  }
}

// --- Funções da API do Feed (Explorar) ---
async function apiGetExplorePosts() {
  try {
    const response = await fetch('/api/posts/explore'); // Chama a nova rota
    if (!response.ok) return;
    const data = await response.json();
    renderExplorePosts(data.posts || []); // Renderiza no feed explorar
  } catch (err) {
    console.error("Falha ao buscar posts do explorar:", err);
    explorePostsEl.innerHTML = "<div class='meta'>Falha ao carregar posts.</div>";
  }
}

async function apiCreatePost() {
  const text = feedInput.value.trim();
  if (!text) return;
  feedSend.disabled = true;
  try {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUser, text: text })
    });
    feedInput.value = ""; 
    apiGetPosts(); 
  } catch (err) {
    console.error("Falha ao criar post:", err);
  }
  feedSend.disabled = false;
}

async function apiLikePost(postId) {
  try {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    // Atualiza ambos os feeds se estiverem ativos
    if (!views.feed.hidden) apiGetPosts(); 
    if (!views.explore.hidden) apiGetExplorePosts();
  } catch (err) {
    console.error("Falha ao dar like:", err);
  }
} 

// --- Renderização do Feed (Pessoal) ---
function renderPosts(posts) {
  if (!postsEl) return;
  if (posts.length === 0) {
    postsEl.innerHTML = "<div class='meta' style='padding: 12px;'>O seu feed está vazio. Siga alguém (ou poste algo) para ver aqui!</div>";
    return;
  }
  renderPostList(postsEl, posts);
}

// --- Renderização do Feed (Explorar) ---
function renderExplorePosts(posts) {
  if (!explorePostsEl) return;
  if (posts.length === 0) {
    explorePostsEl.innerHTML = "<div class='meta' style='padding: 12px;'>Ainda não há posts na rede.</div>";
    return;
  }
  renderPostList(explorePostsEl, posts);
}

// --- Renderização Genérica ---
function renderPostList(containerElement, posts) {
  containerElement.innerHTML = ""; 
  posts.forEach(post => {
    const node = document.createElement("div");
    node.className = "post";
    const postUserInitial = (post.user || "?").slice(0, 2).toUpperCase();
    const postTime = new Date(post.timestamp).toLocaleString('pt-BR');
    const isLiked = post.likes > 0; 

    node.innerHTML = `
      <div class="avatar">${escapeHtml(postUserInitial)}</div>
      <div>
        <div class="meta">
          <strong class="post-username" data-username="${escapeHtml(post.user)}">
            ${escapeHtml(post.user)}
          </strong> 
          • ${postTime}
        </div>
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
    containerElement.appendChild(node);
    
    apiGetComments(post.id);
  });
}


// --- Funções da API de Comentários ---
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
async function apiGetProfile(username) { 
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
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
async function apiGetTestimonials(username) { 
  try {
    const res = await fetch(`/api/testimonials/${encodeURIComponent(username)}`);
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
        to_user: viewedUsername, 
        text: text
      })
    });
    testimonialInput.value = ""; 
    apiGetTestimonials(viewedUsername); 
  } catch (err) {
    console.error("Falha ao salvar depoimento:", err);
  }
  testimonialSend.disabled = false;
}
function renderTestimonials(testimonials) {
  if (!testimonialsEl) return;
  if (testimonials.length === 0) {
    testimonialsEl.innerHTML = "<div class='meta'>Seja o primeiro a deixar um depoimento!</div>";
    return;
  }
  testimonialsEl.innerHTML = ""; 
  testimonials.forEach(item => {
    const node = document.createElement("div");
    node.className = "meta"; 
    node.innerHTML = `<strong>${escapeHtml(item.from_user)}</strong>: ${escapeHtml(item.text)}`;
    testimonialsEl.appendChild(node);
  });
}

// ===================================================
// 3. LÓGICA DO CHAT (Socket.IO / "Agora")
// ===================================================

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
  const isScrolledToBottom = chatMessagesEl.scrollHeight - chatMessagesEl.clientHeight <= chatMessagesEl.scrollTop + 100;
  item.innerHTML = `
    <div class="avatar">${escapeHtml(userInitial)}</div>
    <div class="bubble">
      <div class="meta"><strong>${escapeHtml(user)}</strong> • ${time}</div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
  chatMessagesEl.appendChild(item);
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
socket.on('loadHistory', (messages) => {
  chatMessagesEl.innerHTML = ""; 
  messages.forEach(addMessageBubble);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight; 
});
socket.on('newMessage', (data) => {
  if (data.channel === activeChannel) { 
     addMessageBubble(data);
  }
});


// ===================================================
// 4. EVENTOS (Conexões dos Botões)
// ===================================================

// --- Eventos do Chat (Socket.IO) ---
chatSendBtn.addEventListener("click", sendChatMessage);
chatInputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChatMessage(); });
channelButtons.forEach(c => c.addEventListener("click", () => renderChannel(c.getAttribute("data-channel"))));

// --- Eventos do Feed (Likes, Comentários e Ver Perfil) ---
function handlePostClick(e) {
  const userLink = e.target.closest('.post-username[data-username]');
  if (userLink) {
    viewedUsername = userLink.dataset.username; 
    activateView("profile"); 
    return;
  }
  const likeButton = e.target.closest('[data-like]');
  if (likeButton) {
    const postId = likeButton.dataset.like; 
    apiLikePost(postId); 
    return;
  }
  const commentButton = e.target.closest('[data-comment]');
  if (commentButton) {
    const postId = commentButton.dataset.comment;
    const text = prompt("Digite seu comentário:"); 
    if (text && text.trim()) {
      apiCreateComment(postId, text.trim());
    }
    return;
  }
}
postsEl.addEventListener("click", handlePostClick);
explorePostsEl.addEventListener("click", handlePostClick); 


// --- Eventos dos Botões do Feed (Publicar e Refresh) ---
feedSend.addEventListener("click", apiCreatePost);
feedRefreshBtn.addEventListener("click", apiGetPosts);
btnExploreRefresh.addEventListener("click", apiGetExplorePosts); 

// --- Evento de Depoimento ---
testimonialSend.addEventListener("click", apiCreateTestimonial);

// --- Eventos das Abas ---
viewTabs.forEach(b => b.addEventListener("click", () => {
  const viewName = b.dataset.view;
  activateView(viewName);
}));

// --- Evento do Botão Explorar --- 
btnExplore.addEventListener("click", () => activateView("explore"));

// --- Evento da Userbar (Novo Perfil) --- (NOVO)
userbarMeBtn.addEventListener("click", () => {
  viewedUsername = currentUser; // Define que queremos ver o nosso próprio perfil
  activateView("profile"); // Ativa a vista do perfil
});


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
  if (name === 'explore') {
    viewTabs.forEach(b => b.classList.remove("active"));
    btnExplore.classList.add("active"); 
  } else if (name === 'profile') {
    // 👇 MUDANÇA: Se estamos no perfil, nenhuma aba principal fica ativa
    viewTabs.forEach(b => b.classList.remove("active"));
    btnExplore.classList.remove("active");
  } else {
    // Ativa a aba "Feed" ou "Chat"
    viewTabs.forEach(b => b.classList.toggle("active", b.dataset.view === name));
    btnExplore.classList.remove("active"); 
  }

  // 4. Ajusta o layout do grid
  appEl.classList.remove("view-feed", "view-chat", "view-profile", "view-explore");
  // O layout do "profile" e "explore" é o mesmo do "feed"
  if (name === 'profile' || name === 'explore') {
    appEl.classList.add('view-feed'); 
  } else {
    appEl.classList.add(`view-${name}`); 
  }

  if (name === "chat") {
    channelsEl.style.display = "flex";
    if (socket.connected) {
      renderChannel(activeChannel); 
    }
  } else {
    channelsEl.style.display = "none";
  }

  // 5. Carrega os dados da aba
  if (name === "feed") {
    apiGetPosts(); 
  }
  if (name === "profile") {
    showDynamicProfile(viewedUsername); 
  }
  if (name === "explore") { 
    apiGetExplorePosts();
  }
}

// ===================================================
// 6. LÓGICA DE PERFIL DINÂMICO E SEGUIR
// ===================================================

async function showDynamicProfile(username) {
  if (!username) return;
  apiGetProfile(username);
  apiGetTestimonials(username);
  profileNameEl.textContent = username;
  profileAvatarEl.textContent = username.slice(0, 2).toUpperCase();
  editBioBtn.disabled = true; 
  if (username === currentUser) {
    editBioBtn.textContent = "Editar bio";
    editBioBtn.onclick = apiUpdateBio; 
    editBioBtn.disabled = false;
  } else {
    try {
      const res = await fetch(`/api/isfollowing/${encodeURIComponent(username)}?follower=${encodeURIComponent(currentUser)}`);
      const data = await res.json();
      if (data.isFollowing) {
        editBioBtn.textContent = "Deixar de Seguir";
        editBioBtn.onclick = () => apiUnfollow(username);
      } else {
        editBioBtn.textContent = "Seguir"; 
        editBioBtn.onclick = () => apiFollow(username);
      }
      editBioBtn.disabled = false; 
    } catch (err) {
      console.error("Erro ao verificar 'follow':", err);
      editBioBtn.textContent = "Erro";
    }
  }
}
async function apiFollow(username) {
  editBioBtn.disabled = true;
  try {
    await fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower: currentUser, following: username })
    });
    editBioBtn.textContent = "Deixar de Seguir";
    editBioBtn.onclick = () => apiUnfollow(username);
    editBioBtn.disabled = false;
  } catch (err) {
    console.error("Erro ao seguir:", err);
    editBioBtn.disabled = false;
  }
}
async function apiUnfollow(username) {
  editBioBtn.disabled = true;
  try {
    await fetch('/api/unfollow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower: currentUser, following: username })
    });
    editBioBtn.textContent = "Seguir";
    editBioBtn.onclick = () => apiFollow(username);
    editBioBtn.disabled = false;
  } catch (err) {
    console.error("Erro ao deixar de seguir:", err);
    editBioBtn.disabled = false;
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
  document.getElementById("userName").textContent = currentUser;
  document.getElementById("userAvatar").textContent = currentUser.slice(0, 2).toUpperCase();
  activateView("feed"); 
});