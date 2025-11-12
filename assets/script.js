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

// --- Referências de Visão (Views) ---
const appEl = document.querySelector(".app");
const mainHeader = document.querySelector(".header"); 
const channelsEl = document.querySelector(".channels");
const viewTabs = document.querySelectorAll(".view-tabs .pill"); 
const serverBtns = document.querySelectorAll(".servers .server"); 
const homeBtn = document.getElementById("home-btn"); 

// --- Objeto de Vistas ---
const views = {
  feed: feedView,
  chat: chatView,
  profile: profileView,
  explore: exploreView,
  "explore-servers": exploreServersView 
};

// --- Conexão Socket.IO (Só para o Chat) ---
const socket = io();

// ===================================================
// 2. LÓGICA DO FEED (API / "Agora")
// ===================================================
// ... (Toda a lógica de Feed, Posts, Likes, Comentários - Sem mudanças) ...
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
        <div class="post-actions">
          <button class="mini-btn" data-like="${post.id}">❤ ${post.likes || 0}</button>
          <button class="mini-btn" data-comment="${post.id}">Comentar</button>
        </div>
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

// --- Funções da API do Perfil ---
// ... (Toda a lógica de Perfil, Depoimentos, Seguir - Sem mudanças) ...
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
    let currentLikes = parseInt(likeButton.textContent.trim().split(' ')[1]);
    if (likeButton.classList.contains('liked')) {
      apiUnlikePost(postId); 
      likeButton.classList.remove('liked');
      likeButton.innerHTML = `❤ ${currentLikes - 1}`;
    } else {
      apiLikePost(postId); 
      likeButton.classList.add('liked');
      likeButton.innerHTML = `❤ ${currentLikes + 1}`;
    }
    return;
  }
  const commentButton = e.target.closest('[data-comment]');
  if (commentButton) {
    const postId = commentButton.dataset.comment;
    const text = prompt("Digite seu comentário:"); 
    if (text && text.trim()) { apiCreateComment(postId, text.trim()); }
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

// --- Evento da Userbar (Perfil) --- 
userbarMeBtn.addEventListener("click", () => {
  viewedUsername = currentUser; 
  activateView("profile"); 
});

// --- Eventos dos Servidores ---
homeBtn.addEventListener("click", () => {
  activateView("feed"); 
});

// --- Evento do Botão "+" ---
exploreServersBtn.addEventListener("click", () => {
  activateView("explore-servers");
});

// --- Evento de clique no cartão de Amigo ---
friendsContainer.addEventListener("click", (e) => {
  const friendLink = e.target.closest('.friend-card-name[data-username]');
  if (friendLink) {
    viewedUsername = friendLink.dataset.username;
    activateView("profile"); 
  }
});

// --- Evento de clique para Entrar na Comunidade ---
communityListContainer.addEventListener("click", (e) => {
  const joinButton = e.target.closest('.join-btn[data-community-id]');
  if (joinButton) {
    const communityId = joinButton.dataset.communityId;
    apiJoinCommunity(communityId, joinButton);
  }
});

// --- Evento de clique para Mudar de Comunidade ---
joinedServersList.addEventListener("click", (e) => {
  const communityBtn = e.target.closest('.community-btn[data-community-id]');
  if (communityBtn) {
    const communityId = communityBtn.dataset.communityId;
    activateView("chat", { community: communityId }); 
  }
});

// ===================================================
// 5. LÓGICA DE TROCA DE VISÃO (Views) E INICIALIZAÇÃO
// ===================================================

function activateView(name, options = {}) {
  Object.values(views).forEach(view => view.hidden = true);
  appEl.classList.remove("view-home", "view-community");
  
  document.querySelectorAll(".servers .server, .servers .add-btn").forEach(b => b.classList.remove("active"));
  
  if (name === "feed" || name === "explore" || name === "profile" || name === "explore-servers") {
    
    appEl.classList.add("view-home");
    mainHeader.hidden = false;
    channelsEl.hidden = true;
    views[name].hidden = false;
    
    if (name === 'explore-servers') {
      exploreServersBtn.classList.add("active"); 
    } else {
      homeBtn.classList.add("active"); 
    }
    
    viewTabs.forEach(b => b.classList.toggle("active", b.dataset.view === name));
    btnExplore.classList.toggle("active", name === "explore");
    
    if (name === 'profile' || name === 'explore-servers') { 
      viewTabs.forEach(b => b.classList.remove("active"));
      btnExplore.classList.remove("active");
    }

    if (name === "feed") apiGetPosts(); 
    if (name === "explore") apiGetExplorePosts();
    if (name === "profile") showDynamicProfile(viewedUsername); 
    if (name === "explore-servers") apiGetExploreCommunities(); 
    
  } 
  else if (name === "chat") {
    
    appEl.classList.add("view-community");
    mainHeader.hidden = true; 
    channelsEl.hidden = false; 
    chatView.hidden = false;   
    
    const activeCommunityBtn = document.querySelector(`.community-btn[data-community-id="${options.community}"]`);
    if (activeCommunityBtn) activeCommunityBtn.classList.add("active");
    
    renderChannel("geral"); 
  }
}

// ===================================================
// 6. LÓGICA DE PERFIL DINÂMICO E SEGUIR
// ===================================================

async function showDynamicProfile(username) {
  if (!username) return;
  apiGetProfile(username);
  apiGetTestimonials(username);
  apiGetFollowing(username); 
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
    apiGetFollowing(viewedUsername); 
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
    apiGetFollowing(viewedUsername); 
  } catch (err) {
    console.error("Erro ao deixar de seguir:", err);
    editBioBtn.disabled = false;
  }
}

// ===================================================
// 7. LÓGICA DE EXPLORAR COMUNIDADES
// ===================================================

// 👇 MUDANÇA: Rota agora envia o 'currentUser' 👇
async function apiGetExploreCommunities() {
  try {
    const res = await fetch(`/api/communities/explore?user_name=${encodeURIComponent(currentUser)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderExploreCommunities(data.communities || []);
  } catch (err) {
    console.error("Erro ao buscar comunidades:", err);
    communityListContainer.innerHTML = "<div class='meta'>Falha ao carregar comunidades.</div>";
  }
}

function renderExploreCommunities(communities) {
  if (!communityListContainer) return;
  communityListContainer.innerHTML = ""; 

  if (communities.length === 0) {
    communityListContainer.innerHTML = "<div class='meta'>Nenhuma comunidade pública para entrar.</div>";
    return;
  }

  communities.forEach(community => {
    const node = document.createElement("div");
    node.className = "community-card-explore";
    node.innerHTML = `
      <div class="emoji">${escapeHtml(community.emoji)}</div>
      <div class="community-card-explore-info">
        <h3>${escapeHtml(community.name)}</h3>
        <div class="meta">${escapeHtml(community.description)}</div>
      </div>
      <button class="join-btn" data-community-id="${community.id}">Entrar</button>
    `;
    communityListContainer.appendChild(node);
  });
}

// ===================================================
// 8. LÓGICA DE AMIGOS E ENTRAR EM COMUNIDADES
// ===================================================

// --- Lógica de Amigos ---
async function apiGetFollowing(username) {
  try {
    const res = await fetch(`/api/following/${encodeURIComponent(username)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderFollowing(data.following || []);
  } catch (err) {
    console.error("Erro ao buscar lista de 'seguindo':", err);
    friendsContainer.innerHTML = "<div class='meta'>Falha ao carregar amigos.</div>";
  }
}
function renderFollowing(followingList) {
  if (!friendsContainer) return;
  friendsContainer.innerHTML = ""; 
  if (followingList.length === 0) {
    friendsContainer.innerHTML = "<div class='meta'>Ainda não segue ninguém.</div>";
    return;
  }
  followingList.forEach(username => {
    const node = document.createElement("div");
    node.className = "friend-card";
    const userInitial = username.slice(0, 2).toUpperCase();
    node.innerHTML = `
      <div class="avatar">${escapeHtml(userInitial)}</div>
      <strong class="friend-card-name" data-username="${escapeHtml(username)}">${escapeHtml(username)}</strong>
    `;
    friendsContainer.appendChild(node);
  });
}

// --- Lógica de Entrar/Listar Comunidades ---
async function apiJoinCommunity(communityId, button) {
  button.disabled = true;
  button.textContent = "Entrando...";
  try {
    const res = await fetch('/api/community/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: currentUser, community_id: communityId })
    });
    if (!res.ok) {
      throw new Error('Falha ao entrar na comunidade');
    }
    
    const data = await res.json();
    renderJoinedCommunities([data.community]); 
    activateView("chat", { community: communityId });
    
  } catch (err) {
    console.error("Erro ao entrar na comunidade:", err);
    alert("Falha ao entrar na comunidade.");
    button.disabled = false;
    button.textContent = "Entrar";
  }
}

async function apiGetJoinedCommunities() {
  try {
    const res = await fetch(`/api/communities/joined?user_name=${encodeURIComponent(currentUser)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderJoinedCommunities(data.communities || []);
  } catch (err) {
    console.error("Erro ao buscar comunidades do utilizador:", err);
  }
}

function renderJoinedCommunities(communities) {
  if (!joinedServersList) return;
  
  communities.forEach(community => {
    if (document.querySelector(`.community-btn[data-community-id="${community.id}"]`)) {
      return; 
    }
    
    const node = document.createElement("div");
    node.className = "server community-btn";
    node.dataset.communityId = community.id;
    node.title = community.name;
    node.innerHTML = `<span class="emoji">${escapeHtml(community.emoji)}</span>`;
    
    joinedServersList.appendChild(node);
  });
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
  // CORREÇÃO: Estas linhas estão agora aqui, e vão funcionar
  document.getElementById("userName").textContent = currentUser;
  document.getElementById("userAvatar").textContent = currentUser.slice(0, 2).toUpperCase();
  
  apiGetJoinedCommunities(); 
  activateView("feed"); 
});