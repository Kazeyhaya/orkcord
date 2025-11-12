<script>
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

    // ===============================================
    // 👇 REFERÊNCIAS DO PERFIL ADICIONADAS 👇
    // ===============================================
    const profileBioEl = document.getElementById("profileBio");
    const editBioBtn = document.getElementById("editBioBtn");

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

    // ===============================================
    // 👇 BLOCO DE FUNÇÕES DO PERFIL ADICIONADO 👇
    // ===============================================

    // --- Funções da API do Perfil ---
    
    // [GET] Pede a bio ao servidor
    async function apiGetProfile() {
      try {
        // Usa o nome de usuário global para buscar o perfil
        const res = await fetch(`/api/profile/${encodeURIComponent(currentUser)}`);
        if (!res.ok) return;
        const data = await res.json();
        // Atualiza a bio na tela
        if (profileBioEl) profileBioEl.textContent = data.bio;
      } catch (err) {
        console.error("Falha ao buscar bio:", err);
      }
    }

    // [POST] Salva a bio nova no servidor
    async function apiUpdateBio() {
      const newBio = prompt("Digite sua nova bio:", profileBioEl.textContent);
      
      // Se o usuário cancelou ou não digitou nada, não faz nada
      if (newBio === null || newBio.trim() === "") return; 

      try {
        const res = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: currentUser, bio: newBio.trim() })
        });
        if (!res.ok) return;
        const data = await res.json();
        // Atualiza a bio na tela com o texto salvo
        if (profileBioEl) profileBioEl.textContent = data.bio;
      } catch (err) {
        console.error("Falha ao salvar bio:", err);
      }
    }

    // --- Evento do Perfil ---
    editBioBtn.addEventListener("click", apiUpdateBio);


    // ===================================================
    // 3. LÓGICA DO CHAT (Socket.IO / "Cord")
    // ===================================================

    // --- Funções do Chat ---
    function renderChannel(name) {
      activeChannel = name; // Atualiza o canal ativo
      chatMessagesEl.innerHTML = ""; // Limpa as mensagens
      
      chatTopicBadge.textContent = `# ${name.replace("-", " ")}`;
      chatInputEl.placeholder = `Envie uma mensagem para #${name}`;
      
      // Atualiza o visual dos botões
      document.querySelectorAll(".channel").forEach(c => c.classList.remove("active"));
      const activeBtn = document.querySelector(`.channel[data-channel="${name}"]`);
      if (activeBtn) activeBtn.classList.add("active");

      // **Avisa o backend que entrámos num canal e pede o histórico**
      socket.emit('joinChannel', { channel: activeChannel, user: currentUser });
    }

    function addMessageBubble({ user, timestamp, message }) {
      const item = document.createElement("div");
      item.className = "msg";
      const userInitial = (user || "V").slice(0, 2).toUpperCase();
      const time = timestamp ? timestamp.split(' ')[1] : 'agora'; // Pega só a hora

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
        user: currentUser, // Usa o nome de usuário global
        message: text,
        timestamp: new Date().toLocaleString('pt-BR') // Gera timestamp no front
      };
      
      // Envia para o backend (que vai salvar no PG e retransmitir)
      socket.emit('sendMessage', messageData);
      
      chatInputEl.value = "";
      chatInputEl.focus();
    }

    // --- Eventos do Chat (Socket.IO) ---
    chatSendBtn.addEventListener("click", sendChatMessage);
    chatInputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChatMessage(); });
    channelButtons.forEach(c => c.addEventListener("click", () => renderChannel(c.getAttribute("data-channel"))));

    // --- Ouvintes do Socket.IO (Backend -> Frontend) ---
    socket.on('loadHistory', (messages) => {
      chatMessagesEl.innerHTML = ""; // Garante que está limpo
      messages.forEach(addMessageBubble);
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    });

    socket.on('newMessage', (data) => {
      if (data.channel === activeChannel) { // Só adiciona se for no canal ativo
         addMessageBubble(data);
      }
    });

    // ===================================================
    // 4. LÓGICA DE TROCA DE VISÃO (Views)
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
        // **IMPORTANTE**: Carrega o histórico do chat SÓ quando entra na aba
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
        // ===============================================
        // 👇 CHAMADA DA API DO PERFIL ADICIONADA 👇
        // ===============================================
        apiGetProfile(); // Carrega a bio ao entrar no perfil
      }
    }

    // --- Eventos das Abas ---
    viewTabs.forEach(b => b.addEventListener("click", () => activateView(b.dataset.view)));

    // ===================================================
    // 5. INICIALIZAÇÃO E UTILITÁRIOS
    // ===================================================
    
    // --- Segurança ---
    function escapeHtml(s) {
      if (!s) return "";
      return s.replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
      }[m]));
    }
    
    // --- Inicialização ---
    // Conecta ao socket e, QUANDO conectar, inicializa a primeira view
    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
      activateView("feed"); // Começa o aplicativo na aba "Feed"
    });

  </script>