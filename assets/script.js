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

// --- Estado da UI ---
let activeChannel = "geral"; 
let viewedUsername = currentUser; 
let currentCommunityId = null; 
let currentCommunityName = null; 


// --- Referências do Chat ---
const chatView = document.getElementById("view-chat"); 
const chatMessagesEl = document.getElementById("messages");
const chatTopicBadge = document.getElementById("topic");
const chatInputEl = document.getElementById("composerInput");
const chatSendBtn = document.getElementById("sendBtn");
const channelButtons = document.querySelectorAll(".channel[data-channel]");

// --- Referências do Feed (Pessoal) ---
const feedView = document.getElementById("view-feed"); 
const postsEl = document.getElementById("posts");
const feedInput = document.getElementById("feedInput");
const feedSend = document.getElementById("feedSend");
const feedRefreshBtn = document.getElementById("btn-refresh");

// --- Referências do Feed (Explorar) ---
const exploreView = document.getElementById("view-explore"); 
const explorePostsEl = document.getElementById("explore-posts");
const btnExplore = document.getElementById("btn-explore");
const btnExploreRefresh = document.getElementById("btn-explore-refresh");

// --- Referências do Perfil ---
const profileView = document.getElementById("view-profile"); 
const profileAvatarEl = document.getElementById("profileAvatar");
const profileNameEl = document.getElementById("profileName");
const profileBioEl = document.getElementById("profileBio");
const editBioBtn = document.getElementById("editBioBtn");
const userbarMeBtn = document.getElementById("userbar-me"); 
const friendsContainer = document.getElementById("friends"); 

// --- Referências dos Depoimentos ---
const testimonialsEl = document.getElementById("testimonials");
const testimonialInput = document.getElementById("testimonialInput");
const testimonialSend = document.getElementById("testimonialSend");

// --- Referências de Comunidades ---
const exploreServersView = document.getElementById("view-explore-servers");
const exploreServersBtn = document.getElementById("explore-servers-btn");
const communityListContainer = document.getElementById("community-list-container");
const joinedServersList = document.getElementById("joined-servers-list"); 

// --- Referências de Criação de Comunidade ---
const createCommunityView = document.getElementById("view-create-community");
const btnShowCreateCommunity = document.getElementById("btn-show-create-community");
const btnCancelCreate = document.getElementById("btn-cancel-create");
const createCommunityForm = document.getElementById("create-community-form");


// --- Referências do NOVO LAYOUT DE COMUNIDADE (Fórum) ---
const communityChannelBar = document.querySelector('aside.channels'); 
const communityTopicList = document.getElementById('community-topic-list');
const communityTopicView = document.getElementById('view-community-topics'); 
const communityMembersView = document.getElementById('view-community-members'); 
const communityTabs = document.querySelectorAll('.channels .view-tabs .pill'); 
const communityChatChannelsList = document.getElementById('community-chat-channels');
const currentCommunityNameEl = document.getElementById('current-community-name');
const communityAvatarChannelEl = document.getElementById('community-avatar-channel');
const communityMembersCountEl = document.getElementById('community-members-count');

// --- Referências de Visão (Views) ---
const appEl = document.querySelector(".app");
const mainHeader = document.querySelector(".header"); 
const channelsEl = document.querySelector(".channels");
const viewTabs = document.querySelectorAll(".view-tabs .pill"); 
const serverBtns = document.querySelectorAll(".servers .server"); 
const homeBtn = document.getElementById("home-btn"); 
const headerHomeBtn = document.getElementById("header-home-btn"); 

// --- Objeto de Vistas ---
const views = {
  feed: feedView,
  chat: chatView,
  profile: profileView,
  explore: exploreView,
  "explore-servers": exploreServersView,
  "create-community": createCommunityView,
  "community-topics": communityTopicView, 
  "community-members": communityMembersView 
};

// --- Conexão Socket.IO (Só para o Chat) ---
const socket = io();


// ===================================================
// 1.5 AUXILIARES (Para garantir o Hoisting)
// ===================================================

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[m]));
}


// ===================================================
// 2. LÓGICA DE API E RENDERIZAÇÃO (FUNÇÕES CONSOLIDADAS)
// ===================================================

// --- Funções de Feed/Posts ---
async function apiGetPosts() {
  try {
    const response = await fetch(`/api/posts?user=${encodeURIComponent(currentUser)}`);
    if (!response.ok) return;
    const data = await response.json();
    renderPosts(data.posts || []); 
  } catch (err) { console.error("Falha ao buscar posts:", err); postsEl.innerHTML = "<div class='meta'>Falha ao carregar posts.</div>"; }
}
async function apiGetExplorePosts() {
  try {
    const response = await fetch('/api/posts/explore'); 
    if (!response.ok) return;
    const data = await response.json();
    renderExplorePosts(data.posts || []); 
  } catch (err) { console.error("Falha ao buscar posts do explorar:", err); explorePostsEl.innerHTML = "<div class='meta'>Falha ao carregar posts.</div>"; }
}
async function apiCreatePost() {
  const text = feedInput.value.trim();
  if (!text) return;
  feedSend.disabled = true;
  try {
    await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, text: text }) });
    feedInput.value = ""; 
    apiGetPosts(); 
  } catch (err) { console.error("Falha ao criar post:", err); }
  feedSend.disabled = false;
}
async function apiLikePost(postId) {
  try { await fetch(`/api/posts/${postId}/like`, { method: 'POST' }); } catch (err) { console.error("Falha ao dar like:", err); }
} 
async function apiUnlikePost(postId) {
  try { await fetch(`/api/posts/${postId}/unlike`, { method: 'POST' }); } catch (err) { console.error("Falha ao descurtir:", err); }
}
function renderPosts(posts) {
  if (!postsEl) return;
  if (posts.length === 0) { postsEl.innerHTML = "<div class='meta' style='padding: 12px;'>O seu feed está vazio. Siga alguém (ou poste algo) para ver aqui!</div>"; return; }
  renderPostList(postsEl, posts);
}
function renderExplorePosts(posts) {
  if (!explorePostsEl) return;
  if (posts.length === 0) { explorePostsEl.innerHTML = "<div class='meta' style='padding: 12px;'>Ainda não há posts na rede.</div>"; return; }
  renderPostList(explorePostsEl, posts);
}
function renderPostList(containerElement, posts) {
  containerElement.innerHTML = ""; 
  posts.forEach(post => {
    const node = document.createElement("div");
    node.className = "post";
    const postUserInitial = (post.user || "?").slice(0, 2).toUpperCase();
    const postTime = new Date(post.timestamp).toLocaleString('pt-BR');
    node.innerHTML = `
      <div class="avatar">${escapeHtml(postUserInitial)}</div>
      <div>
        <div class="meta"><strong class="post-username" data-username="${escapeHtml(post.user)}">${escapeHtml(post.user)}</strong> • ${postTime}</div>
        <div>${escapeHtml(post.text)}</div>
        <div class="post-actions"><button class="mini-btn" data-like="${post.id}">❤ ${post.likes || 0}</button><button class="mini-btn" data-comment="${post.id}">Comentar</button></div>
        <div class="comments" id="comments-for-${post.id}"></div>
      </div>`;
    containerElement.appendChild(node);
    apiGetComments(post.id);
  });
}
async function apiGetComments(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments`);
    if (!res.ok) return;
    const data = await res.json();
    renderComments(postId, data.comments || []);
  } catch (err) { console.error(`Falha ao buscar comentários para o post ${postId}:`, err); }
}
async function apiCreateComment(postId, text) {
  try {
    await fetch(`/api/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, text: text }) });
    apiGetComments(postId); 
  } catch (err) { console.error("Falha ao criar comentário:", err); }
}
function renderComments(postId, comments) {
  const container = document.getElementById(`comments-for-${postId}`);
  if (!container) return; 
  if (comments.length === 0) { container.innerHTML = ""; return; }
  container.innerHTML = comments.map(item => `<div class="meta"><strong>${escapeHtml(item.user)}</strong>: ${escapeHtml(item.text)}</div>`).join(""); 
}

// --- Funções de Perfil e Depoimentos ---
async function apiGetProfile(username) { 
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (profileBioEl) profileBioEl.textContent = data.bio;
  } catch (err) { console.error("Falha ao buscar bio:", err); }
} 
async function apiUpdateBio() {
  const newBio = prompt("Digite sua nova bio:", profileBioEl.textContent);
  if (newBio === null || newBio.trim() === "") return; 
  try {
    const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, bio: newBio.trim() }) });
    if (!res.ok) return;
    const data = await res.json();
    if (profileBioEl) profileBioEl.textContent = data.bio;
  } catch (err) { console.error("Falha ao salvar bio:", err); }
}
async function apiGetTestimonials(username) { 
  try {
    const res = await fetch(`/api/testimonials/${encodeURIComponent(username)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderTestimonials(data.testimonials || []);
  } catch (err) { console.error("Falha ao buscar depoimentos:", err); }
}
async function apiCreateTestimonial() {
  const text = testimonialInput.value.trim();
  if (!text) return; 
  testimonialSend.disabled = true;
  try {
    await fetch('/api/testimonials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_user: currentUser, to_user: viewedUsername, text: text }) });
    testimonialInput.value = ""; 
    apiGetTestimonials(viewedUsername); 
  } catch (err) { console.error("Falha ao salvar depoimento:", err); }
  testimonialSend.disabled = false;
}
function renderTestimonials(testimonials) {
  if (!testimonialsEl) return;
  if (testimonials.length === 0) { testimonialsEl.innerHTML = "<div class='meta'>Nenhum depoimento ainda.</div>"; return; }
  testimonialsEl.innerHTML = ""; 
  testimonials.forEach(item => {
    const node = document.createElement("div");
    node.className = "meta"; 
    node.innerHTML = `<strong>${escapeHtml(item.from_user)}</strong>: ${escapeHtml(item.text)}`;
    testimonialsEl.appendChild(node);
  });
}

// --- Funções de Fórum de Comunidades (Corrigido) ---
async function apiGetCommunityPosts(communityId) {
    try {
        const res = await fetch(`/api/community/${communityId}/posts`);
        const data = await res.json();
        renderCommunityPosts(data.posts || []);
    } catch (err) {
        console.error("Erro ao buscar posts do fórum:", err);
        communityTopicList.innerHTML = "<div class='meta'>Falha ao carregar posts do fórum.</div>";
    }
}
function renderCommunityPosts(posts) {
    if (!communityTopicList) return;
    communityTopicList.innerHTML = "";

    if (posts.length === 0) {
        communityTopicList.innerHTML = "<div class='meta' style='padding: 12px;'>Nenhum tópico ainda. Seja o primeiro a iniciar uma discussão!</div>";
        return;
    }

    posts.forEach(post => {
        const node = document.createElement("div");
        node.className = "post"; 
        const userInitial = post.user.slice(0, 2).toUpperCase();
        const postTime = new Date(post.timestamp).toLocaleString('pt-BR');

        node.innerHTML = `
            <div class="avatar">${escapeHtml(userInitial)}</div>
            <div>
                <div class="meta">
                    <strong class="post-username" data-username="${escapeHtml(post.user)}">
                        ${escapeHtml(post.user)}
                    </strong> 
                    • ${postTime}
                </div>
                <h3>${escapeHtml(post.title)}</h3>
                <div>${escapeHtml(post.content)}</div>
                <div class="post-actions">
                    <button class="mini-btn">💬 Comentários</button>
                </div>
            </div>`;
        communityTopicList.appendChild(node);
    });
}

// --- Lógica de Amigos e Entrar em Comunidades ---
async function apiGetFollowing(username) {
  try {
    const res = await fetch(`/api/following/${encodeURIComponent(username)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderFollowing(data.following || []);
  } catch (err) { console.error("Erro ao buscar lista de 'seguindo':", err); friendsContainer.innerHTML = "<div class='meta'>Falha ao carregar amigos.</div>"; }
}
function renderFollowing(followingList) {
  if (!friendsContainer) return;
  friendsContainer.innerHTML = ""; 
  if (followingList.length === 0) { friendsContainer.innerHTML = "<div class='meta'>Ainda não segue ninguém.</div>"; return; }
  followingList.forEach(username => {
    const node = document.createElement("div");
    node.className = "friend-card";
    const userInitial = username.slice(0, 2).toUpperCase();
    node.innerHTML = `<div class="avatar">${escapeHtml(userInitial)}</div><strong class="friend-card-name" data-username="${escapeHtml(username)}">${escapeHtml(username)}</strong>`;
    friendsContainer.appendChild(node);
  });
}
async function apiJoinCommunity(communityId, button) {
  button.disabled = true;
  button.textContent = "Entrando...";
  try {
    const res = await fetch('/api/community/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_name: currentUser, community_id: communityId }) });
    if (!res.ok) { throw new Error('Falha ao entrar na comunidade'); }
    const data = await res.json();
    renderJoinedCommunities([data.community]); 
    activateCommunityView("topics", { community: data.community.id }); // Mudar para Tópicos
  } catch (err) { console.error("Erro ao entrar na comunidade:", err); alert("Falha ao entrar na comunidade."); button.disabled = false; button.textContent = "Entrar"; }
}
async function apiCreateCommunity(name, emoji, button) {
    button.disabled = true;
    button.textContent = "Criando...";
    try {
        const res = await fetch('/api/communities/create', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, emoji, creator: currentUser }), method: 'POST', });
        if (!res.ok) { throw new Error('Falha ao criar comunidade'); }
        const data = await res.json();
        const newComm = data.community;
        renderJoinedCommunities([newComm]); 
        activateCommunityView("topics", { community: newComm.id }); 
    } catch (err) { console.error("Erro ao criar comunidade:", err); alert("Falha ao criar comunidade. Tente novamente."); button.disabled = false; button.textContent = "Criar e Entrar"; }
}
async function apiGetJoinedCommunities() {
  try {
    const res = await fetch(`/api/communities/joined?user_name=${encodeURIComponent(currentUser)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderJoinedCommunities(data.communities || []);
  } catch (err) { console.error("Erro ao buscar comunidades do utilizador:", err); }
}
function renderJoinedCommunities(communities) {
  if (!joinedServersList) return;
  communities.forEach(community => {
    if (document.querySelector(`.community-btn[data-community-id="${community.id}"]`)) { return; }
    const node = document.createElement("div");
    node.className = "server community-btn";
    node.dataset.communityId = community.id;
    node.title = community.name;
    node.innerHTML = `<span class="emoji">${escapeHtml(community.emoji)}</span>`;
    joinedServersList.appendChild(node);
  });
}

// ===================================================
// 3. LÓGICA DO CHAT (Socket.IO / "Agora")
// ===================================================
// ... (Toda a lógica de Chat, Sockets - Sem mudanças) ...
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
  if (isScrolledToBottom) { chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight; }
}
function sendChatMessage() {
  const text = chatInputEl.value.trim();
  if (!text) return;
  const messageData = { channel: activeChannel, user: currentUser, message: text, timestamp: new Date().toLocaleString('pt-BR') };
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
  if (data.channel === activeChannel) { addMessageBubble(data); }
});

// ===================================================
// 4. EVENTOS (Conexões dos Botões)
// ... (Toda a lógica de Eventos - Sem mudanças) ...

// ===================================================
// 5. LÓGICA DE TROCA DE VISÃO (Views) E INICIALIZAÇÃO
// ===================================================

function activateView(name, options = {}) {
  Object.values(views).forEach(view => view.hidden = true);
  appEl.classList.remove("view-home", "view-community");
  
  document.querySelectorAll(".servers .server, .servers .add-btn").forEach(b => b.classList.remove("active"));
  
  if (name === "feed" || name === "explore" || name === "profile" || name === "explore-servers" || name === "create-community") {
    
    appEl.classList.add("view-home");
    mainHeader.hidden = false;
    channelsEl.hidden = true;
    views[name].hidden = false;
    
    if (name === 'explore-servers' || name === 'create-community') { exploreServersBtn.classList.add("active"); } else { homeBtn.classList.add("active"); }
    
    viewTabs.forEach(b => b.classList.toggle("active", b.dataset.view === name));
    btnExplore.classList.toggle("active", name === "explore");
    
    if (name === 'profile' || name === 'explore-servers' || name === 'create-community') { 
      viewTabs.forEach(b => b.classList.remove("active"));
      btnExplore.classList.remove("active");
    }

    if (name === "feed") apiGetPosts(); 
    if (name === "explore") apiGetExplorePosts(); 
    if (name === "profile") showDynamicProfile(viewedUsername); 
    if (name === "explore-servers") apiGetExploreCommunities(); 
    
  } 
}

function activateCommunityView(name, options = {}) {
    Object.values(views).forEach(view => view.hidden = true);
    appEl.classList.add("view-community");
    mainHeader.hidden = true; 
    channelsEl.hidden = false; 
    
    currentCommunityId = options.community;
    
    document.querySelectorAll(".servers .server, .servers .add-btn").forEach(b => b.classList.remove("active"));
    const activeCommunityBtn = document.querySelector(`.community-btn[data-community-id="${options.community}"]`);
    if (activeCommunityBtn) activeCommunityBtn.classList.add("active");

    communityTabs.forEach(b => b.classList.toggle("active", b.dataset.communityView === name));

    communityTopicView.hidden = true;
    communityMembersView.hidden = true;
    communityChatChannelsList.hidden = true;
    chatView.hidden = true; 
    
    if (name === "topics") {
        communityTopicView.hidden = false; 
        apiGetCommunityPosts(currentCommunityId); 
    } else if (name === "chat-channels") {
        chatView.hidden = false; 
        communityChatChannelsList.hidden = false; 
        renderChannel("geral"); 
    } else if (name === "members") {
        communityMembersView.hidden = false; 
    }
}


// ===================================================
// 6. LÓGICA DE PERFIL DINÂMICO E SEGUIR
// ... (omissão por brevidade) ...

// ===================================================
// 7. LÓGICA DE EXPLORAR COMUNIDADES
// ... (omissão por brevidade) ...

// ===================================================
// 8. LÓGICA DE AMIGOS E ENTRAR EM COMUNIDADES
// ... (omissão por brevidade) ...

// ===================================================
// 9. LÓGICA DE FÓRUM DA COMUNIDADE
// ... (omissão por brevidade) ...

// --- Inicialização ---
socket.on('connect', () => {
  console.log('Socket conectado:', socket.id);
  document.getElementById("userName").textContent = currentUser;
  document.getElementById("userAvatar").textContent = currentUser.slice(0, 2).toUpperCase();
  
  apiGetJoinedCommunities(); 
  activateView("feed"); 
});