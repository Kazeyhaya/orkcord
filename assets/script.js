// ===================================================
// 1. ESTADO GLOBAL E OBJETOS DOM
// ===================================================
let currentUser = null;
let activeChannel = null;
let viewedUsername = null;
let currentCommunityId = null; 
let currentCommunityName = null; 
let DOM = {};
let LoginDOM = {};
const socket = io({ autoConnect: false });

// ===================================================
// 1.5 FUNÇÕES AUXILIARES
// ===================================================

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[m]));
}

function renderAvatar(element, { user, avatar_url }) {
  if (!element) return;
  element.innerHTML = "";
  if (avatar_url) {
    element.style.backgroundImage = `url(${avatar_url})`;
  } else {
    element.style.backgroundImage = 'none';
    const initials = (user || "?").slice(0, 2).toUpperCase();
    element.textContent = escapeHtml(initials);
  }
}

function openInputModal({ title, initialValue = '', placeholder = '', onSave }) {
    DOM.modalTitle.textContent = title;
    DOM.modalInput.value = initialValue;
    DOM.modalInput.placeholder = placeholder;
    DOM.modalView.hidden = false;
    DOM.modalInput.focus();
    
    DOM.modalForm.onsubmit = (e) => {
        e.preventDefault();
        const newValue = DOM.modalInput.value.trim();
        if (newValue) {
            onSave(newValue);
        }
        DOM.modalView.hidden = true;
    };
}

// ===================================================
// 2. LÓGICA DE API E RENDERIZAÇÃO
// ===================================================

async function apiGetPosts() {
  try {
    const response = await fetch(`/api/posts?user=${encodeURIComponent(currentUser)}`);
    if (!response.ok) return;
    const data = await response.json();
    renderPosts(data.posts || []); 
  } catch (err) { console.error("Falha ao buscar posts:", err); }
}
async function apiGetExplorePosts() {
  try {
    const response = await fetch('/api/posts/explore'); 
    if (!response.ok) return;
    const data = await response.json();
    renderExplorePosts(data.posts || []); 
  } catch (err) { console.error("Falha ao buscar posts do explorar:", err); }
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
  if (posts.length === 0) { DOM.postsEl.innerHTML = "<div class='meta' style='padding: 12px;'>O seu feed está vazio.</div>"; return; }
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
    
    const avatarEl = document.createElement('div');
    avatarEl.className = 'avatar-display post-avatar';
    renderAvatar(avatarEl, { user: post.user, avatar_url: post.avatar_url });

    const postTime = new Date(post.timestamp).toLocaleString('pt-BR');
    
    const postContent = document.createElement('div');
    postContent.innerHTML = `
      <div class="meta"><strong class="post-username" data-username="${escapeHtml(post.user)}">${escapeHtml(post.user)}</strong> • ${postTime}</div>
      <div>${escapeHtml(post.text)}</div>
      <div class="post-actions"><button class="mini-btn" data-like="${post.id}">❤ ${post.likes || 0}</button><button class="mini-btn" data-comment="${post.id}">Comentar</button></div>
      <div class="comments" id="comments-for-${post.id}"></div>
    `;
    
    node.appendChild(avatarEl);
    node.appendChild(postContent);
    
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

async function apiCreateComment(postId) {
  openInputModal({
    title: "Escreva um comentário",
    placeholder: "Seja simpático...",
    initialValue: "",
    onSave: async (text) => {
      try {
        await fetch(`/api/posts/${postId}/comments`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ user: currentUser, text: text }) 
        });
        apiGetComments(postId);
      } catch (err) { 
        console.error("Falha ao criar comentário:", err); 
        alert("Falha ao salvar comentário.");
      }
    }
  });
}

function renderComments(postId, comments) {
  const container = document.getElementById(`comments-for-${postId}`);
  if (!container) return; 
  if (comments.length === 0) { container.innerHTML = ""; return; }
  container.innerHTML = comments.map(item => `<div class="meta"><strong>${escapeHtml(item.user)}</strong>: ${escapeHtml(item.text)}</div>`).join(""); 
}

// --- Funções de Perfil, Mood, Avatar ---

async function apiGetProfile(username) { 
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(username)}?viewer=${encodeURIComponent(currentUser)}`);
    
    if (!res.ok) {
        throw new Error(`Falha na API: ${res.status}`);
    }
    
    const data = await res.json(); 
    const profileData = data.profile;
    const ratingsData = data.ratings; 
    
    if (DOM.profileBioEl) {
      DOM.profileBioEl.textContent = profileData.bio;
    }
    if (DOM.profileMoodEl) {
      DOM.profileMoodEl.textContent = `Mood: ${profileData.mood || "✨"}`;
    }
    renderAvatar(DOM.profileAvatarEl, profileData);
    
    renderRatings(ratingsData); 

    if (username === currentUser) {
      if (DOM.userbarMood) {
        DOM.userbarMood.textContent = profileData.mood || "✨";
      }
      renderAvatar(DOM.userAvatarEl, profileData);
    }

  } catch (err) { 
    console.error("Falha ao buscar perfil:", err);
    if (DOM.profileBioEl) DOM.profileBioEl.textContent = "Erro ao carregar bio.";
    if (DOM.profileMoodEl) DOM.profileMoodEl.textContent = "Mood: (erro)";
    if (DOM.ratingsDisplayContainer) DOM.ratingsDisplayContainer.innerHTML = "<div class='meta'>Erro ao carregar avaliações.</div>";
  }
} 

function renderRatings(ratings) {
    if (!DOM.ratingsDisplayContainer) return;
    
    const totals = ratings.totals; 
    const userVotes = ratings.userVotes || []; 

    DOM.ratingsDisplayContainer.innerHTML = "";
    
    const items = [
        { key: 'confiavel', icon: '😊', label: 'Confiável', count: totals.confiavel },
        { key: 'legal', icon: '🧊', label: 'Legal', count: totals.legal },
        { key: 'divertido', icon: '🥳', label: 'Divertido', count: totals.divertido }
    ];
    
    if (items.every(item => item.count === 0)) {
        DOM.ratingsDisplayContainer.innerHTML = "<div class='meta'>Ainda não há avaliações.</div>";
    } else {
        items.forEach(item => {
            if (item.count > 0) {
                const node = document.createElement('div');
                node.className = 'rating-item';
                node.innerHTML = `
                    <span class="rating-icon">${item.icon}</span>
                    <span class="rating-label">${item.label}</span>
                    <span class="rating-count">${item.count}</span>
                `;
                DOM.ratingsDisplayContainer.appendChild(node);
            }
        });
    }
    
    DOM.ratingVoteButtons.forEach(button => {
        const ratingType = button.dataset.rating;
        if (userVotes.includes(ratingType)) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

async function apiAddRating(ratingType) {
    try {
        const res = await fetch('/api/profile/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_user: currentUser,
                to_user: viewedUsername,
                rating_type: ratingType
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error);
        }
        
        apiGetProfile(viewedUsername); 
        
    } catch (err) {
        console.error("Falha ao enviar avaliação:", err);
        alert(`Erro ao avaliar: ${err.message}`);
    }
}

async function apiRemoveRating(ratingType) {
    try {
        const res = await fetch('/api/profile/unrate', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_user: currentUser,
                to_user: viewedUsername,
                rating_type: ratingType
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error);
        }
        
        apiGetProfile(viewedUsername); 
        
    } catch (err) {
        console.error("Falha ao remover avaliação:", err);
        alert(`Erro ao remover avaliação: ${err.message}`);
    }
}


async function apiUpdateMood() {
  const currentMood = DOM.userbarMood.textContent;
  
  openInputModal({
    title: "Qual é o seu novo mood?",
    initialValue: currentMood,
    onSave: async (newMood) => {
      DOM.userbarMood.textContent = "Salvando...";
      try {
        const res = await fetch('/api/profile/mood', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ user: currentUser, mood: newMood }) 
        });
        if (!res.ok) throw new Error('Falha ao salvar');
        const data = await res.json();
        DOM.userbarMood.textContent = data.mood;
      } catch (err) {
        console.error("Falha ao salvar mood:", err);
        DOM.userbarMood.textContent = currentMood;
        alert("Não foi possível salvar seu mood.");
      }
    }
  });
}

async function apiUpdateBio() {
  const currentBio = DOM.profileBioEl.textContent;
  
  openInputModal({
    title: "Editar a sua bio",
    initialValue: currentBio,
    onSave: async (newBio) => {
      try {
        const res = await fetch('/api/profile', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ user: currentUser, bio: newBio }) 
        });
        if (!res.ok) throw new Error('Falha ao salvar');
        const data = await res.json();
        if (DOM.profileBioEl) DOM.profileBioEl.textContent = data.bio;
      } catch (err) { 
        console.error("Falha ao salvar bio:", err); 
        alert("Falha ao salvar bio.");
      }
    }
  });
}

async function apiUploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (DOM.profileAvatarEl) DOM.profileAvatarEl.textContent = "⏳";
  if (DOM.userAvatarEl) DOM.userAvatarEl.textContent = "⏳";

  const formData = new FormData();
  formData.append('avatar', file);
  formData.append('user', currentUser);

  try {
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Erro do servidor');
    }

    const data = await res.json(); 

    const profileData = { user: currentUser, avatar_url: data.avatar_url };
    renderAvatar(DOM.profileAvatarEl, profileData);
    renderAvatar(DOM.userAvatarEl, profileData);
    
    apiGetPosts();

  } catch (err) {
    console.error("Falha ao fazer upload do avatar:", err);
    alert(`Erro ao fazer upload: ${err.message}`);
    apiGetProfile(currentUser);
  }
}

// --- Funções de API (Testimonials, Community, etc) ---

async function apiGetTestimonials(username) { 
  try {
    const res = await fetch(`/api/testimonials/${encodeURIComponent(username)}`);
    if (!res.ok) return;
    const data = await res.json();
    renderTestimonials(data.testimonials || []);
  } catch (err) { console.error("Falha ao buscar depoimentos:", err); }
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

async function apiCreateCommunityPost(form) {
    const title = DOM.topicTitleInput.value.trim();
    const content = DOM.topicContentInput.value.trim();
    
    if (!title || !content) {
        alert("Título e conteúdo são obrigatórios.");
        return;
    }
    
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Publicando...";
    
    try {
        const res = await fetch('/api/community/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                community_id: currentCommunityId,
                user: currentUser,
                title: title,
                content: content
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error);
        }
        
        DOM.topicTitleInput.value = "";
        DOM.topicContentInput.value = "";
        activateCommunityView("topics", { community: currentCommunityId });

    } catch (err) {
        console.error("Erro ao criar tópico:", err);
        alert(`Falha ao criar tópico: ${err.message}`);
    }
    
    button.disabled = false;
    button.textContent = "Publicar Tópico";
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
        
        const postTime = new Date(post.timestamp).toLocaleString('pt-BR');
        
        const avatarEl = document.createElement('div');
        avatarEl.className = 'avatar-display post-avatar';
        renderAvatar(avatarEl, { user: post.user, avatar_url: post.avatar_url });
        
        const contentEl = document.createElement('div');
        contentEl.innerHTML = `
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
        `;
        
        node.appendChild(avatarEl);
        node.appendChild(contentEl);
        
        DOM.communityTopicList.appendChild(node);
    });
}

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
  
  followingList.forEach(friend => {
    const node = document.createElement("div");
    node.className = "friend-card";
    
    const avatarEl = document.createElement('div');
    avatarEl.className = 'avatar-display';
    avatarEl.style.width = '32px';
    avatarEl.style.height = '32px';
    avatarEl.style.borderRadius = '8px';
    avatarEl.style.fontSize = '0.9rem';
    renderAvatar(avatarEl, friend);
    
    const nameEl = document.createElement('strong');
    nameEl.className = 'friend-card-name';
    nameEl.dataset.username = friend.user;
    nameEl.textContent = escapeHtml(friend.user);

    node.appendChild(avatarEl);
    node.appendChild(nameEl);
    
    DOM.friendsContainer.appendChild(node);
  });
}

async function apiGetCommunityMembers(communityId) {
  try {
    const res = await fetch(`/api/community/${communityId}/members`);
    if (!res.ok) {
        throw new Error(`Falha na API: ${res.status}`);
    }
    const data = await res.json();
    renderCommunityMembers(data.members || []);
  } catch (err) { 
    console.error("Erro ao buscar lista de membros:", err); 
    if (DOM.communityMemberList) DOM.communityMemberList.innerHTML = "<div class='meta'>Falha ao carregar membros.</div>"; 
  }
}

// 👇 FUNÇÃO MODIFICADA (renderCommunityMembers) 👇
function renderCommunityMembers(members) {
  if (!DOM.communityMemberList) return;
  DOM.communityMemberList.innerHTML = ""; 
  
  const count = members.length;
  
  // Atualiza o título principal (Ex: Membros da Comunidade (1))
  if (DOM.communityMembersTitle) {
      DOM.communityMembersTitle.textContent = `Membros da Comunidade (${count})`;
  }
  
  // ATUALIZA O CONTADOR NA BARRA LATERAL (Ex: 1 membro)
  if (DOM.communityMembersCountEl) {
      DOM.communityMembersCountEl.textContent = `${count} membro${count !== 1 ? 's' : ''}`;
  }
  
  if (count === 0) { 
    DOM.communityMemberList.innerHTML = "<div class='meta'>Nenhum membro encontrado.</div>"; 
    return; 
  }
  
  members.forEach(member => {
    const node = document.createElement("div");
    node.className = "friend-card"; // Reutiliza o estilo dos "amigos"
    
    const avatarEl = document.createElement('div');
    avatarEl.className = 'avatar-display';
    avatarEl.style.width = '32px';
    avatarEl.style.height = '32px';
    avatarEl.style.borderRadius = '8px';
    avatarEl.style.fontSize = '0.9rem';
    renderAvatar(avatarEl, member); 
    
    const nameEl = document.createElement('strong');
    nameEl.className = 'friend-card-name'; 
    nameEl.dataset.username = member.user;
    nameEl.textContent = escapeHtml(member.user);

    node.appendChild(avatarEl);
    node.appendChild(nameEl);
    
    DOM.communityMemberList.appendChild(node);
  });
}
// 👆 FIM DA MODIFICAÇÃO 👆


async function apiJoinCommunity(communityId, button) {
  button.disabled = true;
  button.textContent = "Entrando...";
  try {
    const res = await fetch('/api/community/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_name: currentUser, community_id: communityId }) });
    if (!res.ok) { throw new Error('Falha ao entrar na comunidade'); }
    const data = await res.json();
    renderJoinedCommunities([data.community]); 
    activateCommunityView("topics", { community: data.community.id });
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
// 3. LÓGICA DO CHAT (Apenas para DMs)
// ===================================================

function renderDirectMessage(roomName, targetUser) {
    activeChannel = roomName;
    
    Object.values(DOM.views).forEach(view => view.hidden = true);
    DOM.appEl.classList.remove("view-home");
    DOM.appEl.classList.add("view-community");
    
    DOM.mainHeader.hidden = true; 
    DOM.channelsEl.hidden = false;
    DOM.chatView.hidden = false;
    
    document.querySelectorAll(".servers .server, .servers .add-btn").forEach(b => b.classList.remove("active"));
    DOM.homeBtn.classList.add("active");

    DOM.chatMessagesEl.innerHTML = "";
    DOM.chatTopicBadge.textContent = `@ ${targetUser}`;
    DOM.chatInputEl.placeholder = `Envie uma mensagem para @${targetUser}`;
    
    if (DOM.communityChatChannelsList) DOM.communityChatChannelsList.hidden = true;
    DOM.communityTabs.forEach(b => b.style.display = 'none');
    if (DOM.communityCard) DOM.communityCard.hidden = true;

    socket.emit('joinChannel', { channel: activeChannel, user: currentUser });
}

function startDM(targetUser) {
    if (targetUser === currentUser) return;
    const roomName = [currentUser, targetUser].sort().join('_');
    renderDirectMessage(roomName, targetUser);
}


function addMessageBubble(data) {
  const { user, timestamp, message, avatar_url } = data;
  
  const item = document.createElement("div");
  item.className = "msg";
  const time = timestamp ? new Date(timestamp).toLocaleString('pt-BR').split(' ')[1] : 'agora';
  const isScrolledToBottom = DOM.chatMessagesEl.scrollHeight - DOM.chatMessagesEl.clientHeight <= DOM.chatMessagesEl.scrollTop + 100;
  
  const avatarEl = document.createElement('div');
  avatarEl.className = 'avatar-display post-avatar';
  renderAvatar(avatarEl, { user: user, avatar_url: avatar_url }); 

  item.innerHTML = `
    ${avatarEl.outerHTML}
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
  const messageData = { channel: activeChannel, user: currentUser, message: text };
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
    apiCreateComment(postId);
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
  
  if (name === "feed" || name === "explore" || name === "profile" || name === "explore-servers" || name === "create-community" || name === "create-topic") {
    DOM.appEl.classList.add("view-home");
    DOM.mainHeader.hidden = false;
    DOM.channelsEl.hidden = true;
    
    if (name === 'create-topic') {
        DOM.mainHeader.hidden = true;
        DOM.views[name].hidden = false;
    } else {
        DOM.views[name].hidden = false;
    }
    
    if (name === 'explore-servers' || name === 'create-community') { DOM.exploreServersBtn.classList.add("active"); } else { DOM.homeBtn.classList.add("active"); }
    
    DOM.viewTabs.forEach(b => b.classList.toggle("active", b.dataset.view === name));
    DOM.btnExplore.classList.toggle("active", name === "explore");
    
    if (name === 'profile' || name === 'explore-servers' || name === 'create-community' || name === 'create-topic') { 
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
    DOM.appEl.classList.remove("view-home");
    DOM.appEl.classList.add("view-community");
    
    DOM.mainHeader.hidden = true; 
    DOM.channelsEl.hidden = false; 

    DOM.communityTabs.forEach(b => b.style.display = 'flex');
    if (DOM.communityCard) DOM.communityCard.hidden = false;
    if (DOM.communityChatChannelsList) DOM.communityChatChannelsList.hidden = true;

    currentCommunityId = options.community;
    
    document.querySelectorAll(".servers .server, .servers .add-btn").forEach(b => b.classList.remove("active"));
    const activeCommunityBtn = document.querySelector(`.community-btn[data-community-id="${options.community}"]`);
    if (activeCommunityBtn) activeCommunityBtn.classList.add("active");

    DOM.communityTabs.forEach(b => b.classList.toggle("active", b.dataset.communityView === name));

    DOM.communityTopicView.hidden = true;
    DOM.communityMembersView.hidden = true;
    DOM.chatView.hidden = true;
    
    if (name === "topics") {
        DOM.communityTopicView.hidden = false; 
        apiGetCommunityPosts(currentCommunityId); 
    } else if (name === "members") {
        DOM.communityMembersView.hidden = false; 
        apiGetCommunityMembers(currentCommunityId); 
    }
}

// ===================================================
// 6. LÓGICA DE PERFIL DINÂMICO E SEGUIR
// ===================================================

async function showDynamicProfile(username) {
  if (!username) return;

  DOM.profileNameEl.textContent = username;
  DOM.profileBioEl.textContent = "Carregando bio...";
  DOM.profileMoodEl.textContent = "Mood: ...";
  DOM.ratingsDisplayContainer.innerHTML = "<div class='meta'>Carregando avaliações...</div>";
  DOM.testimonialsEl.innerHTML = "<div class='meta'>Carregando depoimentos...</div>";
  DOM.friendsContainer.innerHTML = "<div class='meta'>Carregando amigos...</div>";
  renderAvatar(DOM.profileAvatarEl, { user: username, avatar_url: null });
  
  DOM.ratingVoteButtons.forEach(button => button.classList.remove('active'));
  
  DOM.profileAvatarEl.classList.remove('is-owner');
  DOM.avatarUploadLabel.style.display = 'none';
  DOM.editBioBtn.disabled = true;
  DOM.ratingsVoteContainer.hidden = true;
  DOM.testimonialFormContainer.hidden = true;
  DOM.dmBtn.style.display = 'none';
  
  apiGetProfile(username);
  apiGetTestimonials(username);
  apiGetFollowing(username); 
  
  if (username === currentUser) {
    DOM.editBioBtn.textContent = "Editar bio";
    DOM.editBioBtn.onclick = apiUpdateBio;
    DOM.editBioBtn.disabled = false;
    DOM.editBioBtn.style.display = 'flex';
    DOM.profileAvatarEl.classList.add('is-owner');
    
  } else {
    DOM.testimonialFormContainer.hidden = false;
    DOM.dmBtn.style.display = 'flex';
    DOM.ratingsVoteContainer.hidden = false;
    DOM.dmBtn.onclick = () => startDM(username);
    
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
      DOM.editBioBtn.style.display = 'flex';
    } catch (err) {
      console.error("Erro ao verificar 'follow':", err);
      DOM.editBioBtn.textContent = "Erro";
      DOM.editBioBtn.style.display = 'flex';
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

function mapAppDOM() {
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
    DOM.profileMoodEl = document.getElementById("profileMood");
    DOM.editBioBtn = document.getElementById("editBioBtn");
    
    DOM.userAvatarEl = document.getElementById("userAvatar");
    DOM.avatarUploadInput = document.getElementById("avatar-upload-input");
    DOM.avatarUploadLabel = document.getElementById("avatar-upload-label");

    DOM.userbarMeBtn = document.getElementById("userbar-me");
    DOM.userbarMoodContainer = document.getElementById("userbar-mood-container");
    DOM.userbarMood = document.getElementById("userbar-mood");
    DOM.friendsContainer = document.getElementById("friends"); 
    DOM.testimonialsEl = document.getElementById("testimonials");
    DOM.testimonialInput = document.getElementById("testimonialInput");
    DOM.testimonialSend = document.getElementById("testimonialSend");
    DOM.testimonialFormContainer = document.getElementById("testimonial-form-container");
    
    DOM.dmBtn = document.getElementById("dmBtn");
    DOM.communityCard = document.querySelector('.community-card');
    
    DOM.modalView = document.getElementById("input-modal");
    DOM.modalForm = document.getElementById("modal-form");
    DOM.modalTitle = document.getElementById("modal-title");
    DOM.modalInput = document.getElementById("modal-input");
    DOM.modalSaveBtn = document.getElementById("modal-save-btn");
    DOM.modalCancelBtn = document.getElementById("modal-cancel-btn");
    
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
    
    DOM.communityMemberList = document.getElementById("community-member-list");
    DOM.communityMembersTitle = document.getElementById("community-members-title");

    DOM.btnNewTopic = document.getElementById("btn-new-topic");
    DOM.createTopicView = document.getElementById("view-create-topic");
    DOM.createTopicForm = document.getElementById("create-topic-form");
    DOM.topicTitleInput = document.getElementById("topic-title");
    DOM.topicContentInput = document.getElementById("topic-content");
    DOM.btnCancelTopic = document.getElementById("btn-cancel-topic");

    DOM.ratingsDisplayContainer = document.getElementById("ratings-display-container");
    DOM.ratingsVoteContainer = document.getElementById("ratings-vote-container");
    DOM.ratingVoteButtons = document.querySelectorAll("#ratings-vote-container .mini-btn");
    
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
        "community-members": DOM.communityMembersView,
        "create-topic": DOM.createTopicView
    };

    DOM.btnMobileMenu = document.getElementById("btn-mobile-menu");
    DOM.serversList = document.querySelector(".servers");
}

function bindAppEvents() {
    DOM.chatSendBtn.addEventListener("click", sendChatMessage);
    DOM.chatInputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChatMessage(); });
    DOM.postsEl.addEventListener("click", handlePostClick);
    DOM.explorePostsEl.addEventListener("click", handlePostClick); 
    DOM.feedSend.addEventListener("click", apiCreatePost);
    DOM.feedRefreshBtn.addEventListener("click", apiGetPosts);
    DOM.btnExploreRefresh.addEventListener("click", apiGetExplorePosts); 
    DOM.testimonialSend.addEventListener("click", apiCreateTestimonial);
    DOM.viewTabs.forEach(b => b.addEventListener("click", () => { const viewName = b.dataset.view; activateView(viewName); }));
    DOM.btnExplore.addEventListener("click", () => activateView("explore"));
    DOM.userbarMeBtn.addEventListener("click", () => { viewedUsername = currentUser; activateView("profile"); });
    DOM.userbarMoodContainer.addEventListener("click", apiUpdateMood);
    DOM.headerHomeBtn.addEventListener("click", () => { activateView("feed"); });
    DOM.homeBtn.addEventListener("click", () => { activateView("feed"); });
    DOM.exploreServersBtn.addEventListener("click", () => { activateView("explore-servers"); });
    
    DOM.modalCancelBtn.addEventListener("click", () => {
        DOM.modalView.hidden = true;
    });
    
    DOM.avatarUploadInput.addEventListener("change", apiUploadAvatar);
    DOM.profileAvatarEl.addEventListener("click", () => {
      if (DOM.profileAvatarEl.classList.contains('is-owner')) {
        DOM.avatarUploadInput.click();
      }
    });

    DOM.friendsContainer.addEventListener("click", (e) => {
      const friendLink = e.target.closest('.friend-card-name[data-username]');
      if (friendLink) { viewedUsername = friendLink.dataset.username; activateView("profile"); }
    });
    
    if (DOM.communityMemberList) {
        DOM.communityMemberList.addEventListener("click", (e) => {
          const memberLink = e.target.closest('.friend-card-name[data-username]');
          if (memberLink) { 
            viewedUsername = memberLink.dataset.username; 
            activateView("profile"); 
          }
        });
    }

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
    
    DOM.btnNewTopic.addEventListener("click", () => {
        activateView("create-topic"); 
    });
    DOM.btnCancelTopic.addEventListener("click", () => {
        activateCommunityView("topics", { community: currentCommunityId });
    });
    DOM.createTopicForm.addEventListener("submit", (e) => {
        e.preventDefault();
        apiCreateCommunityPost(DOM.createTopicForm);
    });
    
    DOM.communityTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.communityView;
            if (view) {
                activateCommunityView(view, { community: currentCommunityId });
            }
        });
    });
    
    DOM.ratingVoteButtons.forEach(button => {
        button.addEventListener("click", () => {
            const ratingType = button.dataset.rating;
            
            if (button.classList.contains('active')) {
                apiRemoveRating(ratingType);
            } else {
                apiAddRating(ratingType);
            }
        });
    });

    DOM.btnMobileMenu.addEventListener("click", () => {
        DOM.serversList.classList.toggle("is-open");
    });

    DOM.serversList.addEventListener("click", (e) => {
        if (window.innerWidth <= 640 && DOM.serversList.classList.contains("is-open")) {
            if (e.target.closest(".server") || e.target.closest(".add-btn")) {
                DOM.serversList.classList.remove("is-open");
            }
        }
    });
}

function startApp() {
  console.log('Socket conectado:', socket.id);
  mapAppDOM();
  bindAppEvents();
  
  document.getElementById("userName").textContent = currentUser;
  
  apiGetJoinedCommunities(); 
  apiGetProfile(currentUser);
  
  activateView("feed"); 
  DOM.appEl.hidden = false;
  LoginDOM.view.hidden = true;
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const username = LoginDOM.input.value.trim();
    if (!username) return;
    
    currentUser = username;
    viewedUsername = currentUser;
    localStorage.setItem("agora:user", currentUser);
    
    socket.connect();
}

function checkLogin() {
    LoginDOM.view = document.getElementById('login-view');
    LoginDOM.form = document.getElementById('login-form');
    LoginDOM.input = document.getElementById('login-username-input');
    DOM.appEl = document.querySelector(".app"); 

    const storedUser = localStorage.getItem("agora:user");
    
    socket.on('connect', startApp);

    if (storedUser && storedUser.trim()) {
        currentUser = storedUser.trim();
        viewedUsername = currentUser;
        socket.connect();
    } else {
        LoginDOM.view.hidden = false;
        DOM.appEl.hidden = true;
        LoginDOM.form.addEventListener('submit', handleLoginSubmit);
    }
}

checkLogin();