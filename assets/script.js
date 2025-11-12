// ===================================================
// 1. ESTADO GLOBAL E REFERÊNCIAS
// ===================================================

// --- Identificação do Usuário ---
const storedUser = localStorage.getItem("agora:user"); // <--- MUDANÇA AQUI: agora:user
let currentUser = storedUser && storedUser.trim() ? storedUser.trim() : null;
if (!currentUser) {
  currentUser = prompt("Digite seu nome de usuário (para o Feed e Chat):");
  if (!currentUser || !currentUser.trim()) currentUser = "Anônimo";
  localStorage.setItem("agora:user", currentUser); // <--- MUDANÇA AQUI: agora:user
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
  // Adiciona o post na "memória" ANTES de chamar a API
  likedPostsInSession.add(postId.toString());
  // Atualiza o feed otimisticamente (sem esperar o servidor)
  apiGetPosts(); 
  
  try {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    // O refresh (apiGetPosts) já foi chamado, então não precisa de novo
  } catch (err) {
    console.error("Falha ao dar like:", err);
    // Se der erro, remove da memória para o usuário poder tentar de novo
    likedPostsInSession.delete(postId.toString());
    apiGetPosts(); // Reverte o like
  }
} 

async function apiUnlikePost(postId) {
  // Remove o post da "memória" ANTES de chamar a API
  likedPostsInSession.delete(postId.toString());
  // Atualiza o feed otimisticamente
  apiGetPosts();

  try {
    await fetch(`/api/posts/${postId}/unlike`, { method: 'POST' });
  } catch (err) {
    console.error("Falha ao descurtir:", err);
    // Se der erro, adiciona de volta na memória
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

    // Verifica a "memória" para saber se o post foi curtido
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
  const clickedButton = e.target.closest('[data-like]'); // Pega o botão
  if (clickedButton) {
    const postId = clickedButton.dataset.like; 
    
    // Agora ele checa se o botão tem a classe '.liked'
    if (clickedButton.classList.contains('liked')) {
      // Se tem, DESCURTE
      apiUnlikePost(postId);
    } else {
      // Se não tem, CURTE
      apiLikePost(postId);
    }
  }
});


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

// --- Evento do Perfil ---
editBioBtn.addEventListener("click", apiUpdateBio);


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

// --- Evento de Depoimento ---
testimonialSend.addEventListener("click", apiCreateTestimonial);


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

  item.innerHTML = `
    <div class="avatar">${escapeHtml(userInitial)}</div>
    <div class="bubble">
      <div class="meta"><strong>${escapeHtml(user)}</strong> • ${time}</div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
  chatMessagesEl.appendChild(item);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function sendChatMessage() {
  const text = chatInputEl.value.trim();
  if (!text) return;

  const messageData = {
    channel: activeChannel,
    user: currentUser, 
    message: text,
    timestamp: new Date().toLocaleString('pt-BR')