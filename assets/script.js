// ===================================================
// 1. ESTADO GLOBAL (Sem Referências DOM)
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

// --- Objeto de Referências DOM ---
let DOM = {}; // 👈 Todas as referências DOM viverão aqui.

// --- Conexão Socket.IO (Só para o Chat) ---
const socket = io();


// ===================================================
// 1.5 FUNÇÕES AUXILIARES (Definidas Primeiro)
// ===================================================

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[m]));
}

// ===================================================
// 2. LÓGICA DE API E RENDERIZAÇÃO (FUNÇÕES)
// ===================================================

// --- Funções de Feed/Posts ---
async function apiGetPosts() {
  try {
    const response = await fetch(`/api/posts?user=${encodeURIComponent(currentUser)}`);
    if (!response.ok) return;
    const data = await response.json();
    renderPosts(data.posts || []); 
  } catch (err) { console.error("Falha ao buscar posts:", err); if (DOM.postsEl) DOM.postsEl.innerHTML = "<div class='meta'>Falha ao carregar posts.</div>"; }
}
async function apiGetExplorePosts() {
  try {
    const response = await fetch('/api/posts/explore'); 
    if (!response.ok) return;
    const data = await response.json();
    renderExplorePosts(data.posts || []); 
  } catch (err) { console.error("Falha ao buscar posts do explorar:", err); if (DOM.explorePostsEl) DOM.explorePostsEl.innerHTML = "<div class='meta'>Falha ao carregar posts.</div>"; }
}
async function apiCreatePost() {
  const text = DOM.feedInput.value.trim();
  if (!text) return;
  DOM.feedSend.disabled = true;
  try {
    await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, text: text }) });
    DOM.feedInput.value = ""; 
    apiGetPosts(); 
  } catch (err) { console.error("Falha ao criar post:", err); }
  DOM.feedSend.disabled = false;
}
async function apiLikePost(postId) {
  try { await fetch(`/api/posts/${postId}/like`, { method: 'POST' }); } catch (err) { console.error("Falha ao dar like:", err); }
} 
async function apiUnlikePost(postId) {
  try { await fetch(`/api/posts/${postId}/unlike`, { method: 'POST' }); } catch (err) { console.error("Falha ao descurtir:", err); }
}
function renderPosts(posts) {
  if (!DOM.postsEl) return;
  if (posts.length === 0) { DOM.postsEl.innerHTML = "<div class='meta' style='padding: 12px;'>O seu feed está vazio. Siga alguém (ou poste algo) para ver aqui!</div>"; return; }
  renderPostList(DOM.postsEl, posts);
}
function renderExplorePosts(posts) {
  if (!DOM.explorePostsEl) return;
  if (posts.length === 0) { DOM.explorePostsEl.innerHTML = "<div class='meta' style='padding: 12px;'>Ainda não há posts na rede.</div>"; return; }
  renderPostList(DOM.explorePostsEl, posts);
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
    if (DOM.profileBioEl) DOM.profileBioEl.textContent = data.bio;
  } catch (err) { console.error("Falha ao buscar bio:", err); }
} 
async function apiUpdateBio() {
  const newBio = prompt("Digite sua nova bio:", DOM.profileBioEl.textContent);
  if (newBio === null || newBio.trim() === "") return; 
  try {
    const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, bio: newBio.trim() }) });
    if (!res.ok) return;
    const data = await res.json();
    if (DOM.profileBioEl) DOM.profileBioEl.textContent = data.bio;
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
  const text = DOM.testimonialInput.value.trim();
  if (!text) return; 
  DOM.testimonialSend.disabled = true;
  try {
    await fetch('/api/testimonials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_user: currentUser, to_user: viewedUsername, text: text }) });
    DOM.testimonialInput.value = ""; 
    apiGetTestimonials(viewedUsername); 
  } catch (err) { console.error("Falha ao salvar depoimento:", err); }
  DOM.testimonialSend.disabled = false;
}
function renderTestimonials(testimonials) {
  if (!DOM.testimonialsEl) return;
  if (testimonials.length === 0) { DOM.testimonialsEl.innerHTML = "<div class='meta'>Nenhum depoimento ainda.</div>"; return; }
  DOM.testimonialsEl.innerHTML = ""; 
  testimonials.forEach(item => {
    const node = document.createElement("div");
    node.className = "meta"; 
    node.innerHTML = `<strong>${escapeHtml(item.from_user)}</strong>: ${escapeHtml(item.text)}`;
    DOM.testimonialsEl.appendChild(node);
  });
}

// --- Funções de Fórum de Comunidades ---
async function apiGetCommunityPosts(communityId) {
    try {
        const res = await fetch(`/api/community/${communityId}/posts`);
        const data = await res.json();
        renderCommunityPosts(data.posts || []);
    } catch (err) {
        console.error("Erro ao buscar posts do fórum:", err);
        if (DOM.communityTopicList) DOM.communityTopicList.innerHTML = "<div class='meta'>Falha ao carregar posts do fórum.</div>";
    }
}
function renderCommunityPosts(posts) {
    if (!DOM.communityTopicList) return;
    DOM.communityTopicList.innerHTML = "";

    if (posts.length === 0) {
        DOM.communityTopicList.innerHTML = "<div class='meta' style='padding: 12px;'>Nenhum tópico ainda. Seja o primeiro a iniciar uma discussão!</div>";
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
        DOM.communityTopicList.appendChild(node);
    });
}

// --- Lógica de Amigos e Entrar em Comunidades ---
async function apiGetFollowing(username) {
  try {
    const res = await fetch(`/api/following/${encodeURIComponent(username)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderFollowing(data.following || []);
  } catch (err) { console.error("Erro ao buscar lista de 'seguindo':", err); if (DOM.friendsContainer) DOM.friendsContainer.innerHTML = "<div class='meta'>Falha ao carregar amigos.</div>"; }
}
function renderFollowing(followingList) {
  if (!DOM.friendsContainer) return;
  DOM.friendsContainer.innerHTML = ""; 
  if (followingList.length === 0) { DOM.friendsContainer.innerHTML = "<div class='meta'>Ainda não segue ninguém.</div>"; return; }
  followingList.forEach(username => {
    const node = document.createElement("div");
    node.className = "friend-card";
    const userInitial = username.slice(0, 2).toUpperCase();
    node.innerHTML = `<div class="avatar">${escapeHtml(userInitial)}</div><strong class="friend-card-name" data-username="${escapeHtml(username)}">${escapeHtml(username)}</strong>`;
    DOM.friendsContainer.appendChild(node);
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
    activateCommunityView("topics", { community: data.community.id }); // MUDANÇA: Ir para Tópicos
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
  if (!DOM.joinedServersList) return;
  communities.forEach(community => {
    if (document.querySelector(`.community-btn[data-community-id="${community.id}"]`)) { return; }
    const node = document.createElement("div");
    node.className = "server community-btn";
    node.dataset.communityId = community.id;
    node.title = community.name;
    node.innerHTML = `<span class="emoji">${escapeHtml(community.emoji)}</span>`;
    DOM.joinedServersList.appendChild(node);
  });
}
async function apiGetExploreCommunities() {
  try {
    const res = await fetch(`/api/communities/explore?user_name=${encodeURIComponent(currentUser)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderExploreCommunities(data.communities || []);
  } catch (err) {
    console.error("Erro ao buscar comunidades:", err);
    if (DOM.communityListContainer) DOM.communityListContainer.innerHTML = "<div class='meta'>Falha ao carregar comunidades.</div>";
  }
}
function renderExploreCommunities(communities) {
  if (!DOM.communityListContainer) return;
  DOM.communityListContainer.innerHTML = ""; 

  if (communities.length === 0) {
    DOM.communityListContainer.innerHTML = "<div class='meta'>Nenhuma comunidade pública para entrar.</div>";
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
    DOM.communityListContainer.appendChild(node);
  });
}

// ===================================================
// 3. LÓGICA DO CHAT (Socket.IO / "Agora")
// ===================================================
function renderChannel(name) {
  activeChannel = name; 
  DOM.chatMessagesEl.innerHTML = ""; 
  DOM.chatTopicBadge.textContent = `# ${name.replace("-", " ")}`;
  DOM.chatInputEl.placeholder = `Envie uma mensagem para #${name}`;
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
  const isScrolledToBottom = DOM.chatMessagesEl.scrollHeight - DOM.chatMessagesEl.clientHeight <= DOM.chatMessagesEl.scrollTop + 100;
  item.innerHTML = `
    <div class="avatar">${escapeHtml(userInitial)}</div>
    <div class="bubble">
      <div class="meta"><strong>${escapeHtml(user)}</strong> • ${time}</div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
  DOM.chatMessagesEl.appendChild(item);
  if (isScrolledToBottom) { DOM.chatMessagesEl.scrollTop = DOM.chatMessagesEl.scrollHeight; }
}
function sendChatMessage() {
  const text = DOM.chatInputEl.value.trim();
  if (!text) return;
  const messageData = { channel: activeChannel, user: currentUser, message: text, timestamp: new Date().toLocaleString('pt-BR') };
  socket.emit('sendMessage', messageData);
  DOM.chatInputEl.value = "";
  DOM.chatInputEl.focus();
}
socket.on('loadHistory', (messages) => {
  if (!DOM.chatMessagesEl) return;
  DOM.chatMessagesEl.innerHTML = ""; 
  messages.forEach(addMessageBubble);
  DOM.chatMessagesEl.scrollTop = DOM.chatMessagesEl.scrollHeight; 
});
socket.on('newMessage', (data) => {
  if (data.channel === activeChannel) { addMessageBubble(data); }
});


// ===================================================
// 4. EVENTOS (Conexões dos Botões)
// ===================================================

function handlePostClick(e) {
  const userLink = e.target.closest('.post-username[data-username]');
  if (userLink) { viewedUsername = userLink.dataset.username; activateView("profile"); return; }
  const likeButton = e.target.closest('[data-like]');
  if (likeButton) {
    const postId = likeButton.dataset.like; 
    let currentLikes = parseInt(likeButton.textContent.trim().split(' ')[1]);
    if (likeButton.classList.contains('liked')) { apiUnlikePost(postId); likeButton.classList.remove('liked'); likeButton.innerHTML = `❤ ${currentLikes - 1}`; } else { apiLikePost(postId); likeButton.classList.add('liked'); likeButton.innerHTML = `❤ ${currentLikes + 1}`; }
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

// ===================================================
// 5. LÓGICA DE TROCA DE VISÃO (Views)
// ===================================================

function activateView(name, options = {}) {
  Object.values(DOM.views).forEach(view => view.hidden = true);
  DOM.appEl.classList.remove("view-home", "view-community");
  
  document.querySelectorAll(".servers .server, .servers .add-btn").forEach(b => b.classList.remove("active"));
  
  if (name === "feed" || name === "explore" || name === "profile" || name === "explore-servers" || name === "create-community") {
    
    DOM.appEl.classList.add("view-home");
    DOM.mainHeader.hidden = false;
    DOM.channelsEl.hidden = true;
    DOM.views[name].hidden = false;
    
    if (name === 'explore-servers' || name === 'create-community') { DOM.exploreServersBtn.classList.add("active"); } else { DOM.homeBtn.classList.add("active"); }
    
    DOM.viewTabs.forEach(b => b.classList.toggle("active", b.dataset.view === name));
    DOM.btnExplore.classList.toggle("active", name === "explore");
    
    if (name === 'profile' || name === 'explore-servers' || name === 'create-community') { 
      DOM.viewTabs.forEach(b => b.classList.remove("active"));
      DOM.btnExplore.classList.remove("active");
    }

    if (name === "feed") apiGetPosts(); 
    if (name === "explore") apiGetExplorePosts(); 
    if (name === "profile") showDynamicProfile(viewedUsername); 
    if (name === "explore-servers") apiGetExploreCommunities(); 
    
  } 
}

function activateCommunityView(name, options = {}) {
    Object.values(DOM.views).forEach(view => view.hidden = true);
    
    // 👇 CORREÇÃO: Remover a classe 'view-home'
    DOM.appEl.classList.remove("view-home");
    DOM.appEl.classList.add("view-community");
    
    DOM.mainHeader.hidden = true; 
    DOM.channelsEl.hidden = false; 
    
    currentCommunityId = options.community;
    
    document.querySelectorAll(".servers .server, .servers .add-btn").forEach(b => b.classList.remove("active"));
    const activeCommunityBtn = document.querySelector(`.community-btn[data-community-id="${options.community}"]`);
    if (activeCommunityBtn) activeCommunityBtn.classList.add("active");

    DOM.communityTabs.forEach(b => b.classList.toggle("active", b.dataset.communityView === name));

    DOM.communityTopicView.hidden = true;
    DOM.communityMembersView.hidden = true;
    DOM.communityChatChannelsList.hidden = true;
    DOM.chatView.hidden = true; 
    
    if (name === "topics") {
        DOM.communityTopicView.hidden = false; 
        apiGetCommunityPosts(currentCommunityId); 
    } else if (name === "chat-channels") {
        DOM.chatView.hidden = false; 
        DOM.communityChatChannelsList.hidden = false; 
        renderChannel("geral"); 
    } else if (name === "members") {
        DOM.communityMembersView.hidden = false; 
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
  DOM.profileNameEl.textContent = username;
  DOM.profileAvatarEl.textContent = username.slice(0, 2).toUpperCase();
  DOM.editBioBtn.disabled = true; 
  if (username === currentUser) {
    DOM.editBioBtn.textContent = "Editar bio";
    DOM.editBioBtn.onclick = apiUpdateBio; 
    DOM.editBioBtn.disabled = false;
  } else {
    try {
      const res = await fetch(`/api/isfollowing/${encodeURIComponent(username)}?follower=${encodeURIComponent(currentUser)}`);
      const data = await res.json();
      if (data.isFollowing) {
        DOM.editBioBtn.textContent = "Deixar de Seguir";
        DOM.editBioBtn.onclick = () => apiUnfollow(username);
      } else {
        DOM.editBioBtn.textContent = "Seguir"; 
        DOM.editBioBtn.onclick = () => apiFollow(username);
      }
      DOM.editBioBtn.disabled = false; 
    } catch (err) {
      console.error("Erro ao verificar 'follow':", err);
      DOM.editBioBtn.textContent = "Erro";
    }
  }
}
async function apiFollow(username) {
  DOM.editBioBtn.disabled = true;
  try {
    await fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower: currentUser, following: username })
    });
    DOM.editBioBtn.textContent = "Deixar de Seguir";
    DOM.editBioBtn.onclick = () => apiUnfollow(username);
    DOM.editBioBtn.disabled = false;
    apiGetFollowing(viewedUsername); 
  } catch (err) {
    console.error("Erro ao seguir:", err);
    DOM.editBioBtn.disabled = false;
  }
}
async function apiUnfollow(username) {
  DOM.editBioBtn.disabled = true;
  try {
    await fetch('/api/unfollow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower: currentUser, following: username })
    });
    DOM.editBioBtn.textContent = "Seguir";
    DOM.editBioBtn.onclick = () => apiFollow(username);
    DOM.editBioBtn.disabled = false;
    apiGetFollowing(viewedUsername); 
  } catch (err) {
    console.error("Erro ao deixar de seguir:", err);
    DOM.editBioBtn.disabled = false;
  }
}

// ===================================================
// 7. INICIALIZAÇÃO
// ===================================================

function initializeUI() {
    // 1. Definição de TODAS as referências DOM
    DOM.chatView = document.getElementById("view-chat"); 
    DOM.chatMessagesEl = document.getElementById("messages");
    DOM.chatTopicBadge = document.getElementById("topic");
    DOM.chatInputEl = document.getElementById("composerInput");
    DOM.chatSendBtn = document.getElementById("sendBtn");
    DOM.feedView = document.getElementById("view-feed"); 
    DOM.postsEl = document.getElementById("posts");
    DOM.feedInput = document.getElementById("feedInput");
    DOM.feedSend = document.getElementById("feedSend");
    DOM.feedRefreshBtn = document.getElementById("btn-refresh");
    DOM.exploreView = document.getElementById("view-explore"); 
    DOM.explorePostsEl = document.getElementById("explore-posts");
    DOM.btnExplore = document.getElementById("btn-explore");
    DOM.btnExploreRefresh = document.getElementById("btn-explore-refresh");
    DOM.profileView = document.getElementById("view-profile"); 
    DOM.profileAvatarEl = document.getElementById("profileAvatar");
    DOM.profileNameEl = document.getElementById("profileName");
    DOM.profileBioEl = document.getElementById("profileBio");
    DOM.editBioBtn = document.getElementById("editBioBtn");
    DOM.userbarMeBtn = document.getElementById("userbar-me"); 
    DOM.friendsContainer = document.getElementById("friends"); 
    DOM.testimonialsEl = document.getElementById("testimonials");
    DOM.testimonialInput = document.getElementById("testimonialInput");
    DOM.testimonialSend = document.getElementById("testimonialSend");
    DOM.exploreServersView = document.getElementById("view-explore-servers");
    DOM.exploreServersBtn = document.getElementById("explore-servers-btn");
    DOM.communityListContainer = document.getElementById("community-list-container");
    DOM.joinedServersList = document.getElementById("joined-servers-list"); 
    DOM.createCommunityView = document.getElementById("view-create-community");
    DOM.btnShowCreateCommunity = document.getElementById("btn-show-create-community");
    DOM.btnCancelCreate = document.getElementById("btn-cancel-create");
    DOM.createCommunityForm = document.getElementById("create-community-form");
    DOM.communityChannelBar = document.querySelector('aside.channels'); 
    DOM.communityTopicList = document.getElementById('community-topic-list');
    DOM.communityTopicView = document.getElementById('view-community-topics'); 
    DOM.communityMembersView = document.getElementById('view-community-members'); 
    DOM.communityTabs = document.querySelectorAll('.channels .view-tabs .pill'); 
    DOM.communityChatChannelsList = document.getElementById('community-chat-channels');
    DOM.currentCommunityNameEl = document.getElementById('current-community-name');
    DOM.communityAvatarChannelEl = document.getElementById('community-avatar-channel');
    DOM.communityMembersCountEl = document.getElementById('community-members-count');
    DOM.appEl = document.querySelector(".app");
    DOM.mainHeader = document.querySelector(".header"); 
    DOM.channelsEl = document.querySelector(".channels");
    DOM.viewTabs = document.querySelectorAll(".header .view-tabs .pill"); 
    DOM.serverBtns = document.querySelectorAll(".servers .server"); 
    DOM.homeBtn = document.getElementById("home-btn"); 
    DOM.headerHomeBtn = document.getElementById("header-home-btn"); 
    DOM.views = {
        feed: DOM.feedView,
        chat: DOM.chatView,
        profile: DOM.profileView,
        explore: DOM.exploreView,
        "explore-servers": DOM.exploreServersView,
        "create-community": DOM.createCommunityView,
        "community-topics": DOM.communityTopicView, 
        "community-members": DOM.communityMembersView 
    };

    // 2. LIGAÇÃO DOS EVENTOS (Usando DOM.references)
    DOM.chatSendBtn.addEventListener("click", sendChatMessage);
    DOM.chatInputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChatMessage(); });
    document.querySelectorAll(".channel[data-channel]").forEach(c => c.addEventListener("click", () => renderChannel(c.getAttribute("data-channel"))));
    DOM.postsEl.addEventListener("click", handlePostClick);
    DOM.explorePostsEl.addEventListener("click", handlePostClick); 
    DOM.feedSend.addEventListener("click", apiCreatePost);
    DOM.feedRefreshBtn.addEventListener("click", apiGetPosts);
    DOM.btnExploreRefresh.addEventListener("click", apiGetExplorePosts); 
    DOM.testimonialSend.addEventListener("click", apiCreateTestimonial);
    DOM.viewTabs.forEach(b => b.addEventListener("click", () => { const viewName = b.dataset.view; activateView(viewName); }));
    DOM.btnExplore.addEventListener("click", () => activateView("explore"));
    DOM.userbarMeBtn.addEventListener("click", () => { viewedUsername = currentUser; activateView("profile"); });
    DOM.headerHomeBtn.addEventListener("click", () => { activateView("feed"); });
    DOM.homeBtn.addEventListener("click", () => { activateView("feed"); });
    DOM.exploreServersBtn.addEventListener("click", () => { activateView("explore-servers"); });
    DOM.friendsContainer.addEventListener("click", (e) => {
      const friendLink = e.target.closest('.friend-card-name[data-username]');
      if (friendLink) { viewedUsername = friendLink.dataset.username; activateView("profile"); }
    });
    DOM.communityListContainer.addEventListener("click", (e) => {
      const joinButton = e.target.closest('.join-btn[data-community-id]');
      if (joinButton) { const communityId = joinButton.dataset.communityId; apiJoinCommunity(communityId, joinButton); }
    });
    DOM.joinedServersList.addEventListener("click", (e) => {
      const communityBtn = e.target.closest('.community-btn[data-community-id]');
      if (communityBtn) { const communityId = communityBtn.dataset.communityId; activateCommunityView("topics", { community: communityId }); }
    });
    DOM.btnShowCreateCommunity.addEventListener("click", () => { activateView("create-community"); });
    DOM.btnCancelCreate.addEventListener("click", () => { activateView("explore-servers"); });
    DOM.createCommunityForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("community-name").value.trim();
        const emoji = document.getElementById("community-emoji").value.trim();
        if (!name) return;
        apiCreateCommunity(name, emoji, DOM.createCommunityForm.querySelector('button[type="submit"]'));
    });
    DOM.communityTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.communityView;
            activateCommunityView(view, { community: currentCommunityId });
        });
    });
}


socket.on('connect', () => {
  console.log('Socket conectado:', socket.id);
  
  // 1. Encontra e liga todos os elementos DOM
  initializeUI();
  
  // 2. Define os nomes de utilizador na UI
  document.getElementById("userName").textContent = currentUser;
  document.getElementById("userAvatar").textContent = currentUser.slice(0, 2).toUpperCase();
  
  // 3. Carrega os dados iniciais
  apiGetJoinedCommunities(); 
  activateView("feed"); 
});