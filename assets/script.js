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