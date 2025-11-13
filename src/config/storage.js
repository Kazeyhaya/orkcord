// src/config/storage.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configura o Cloudinary (ele vai buscar a variável de ambiente automaticamente)
cloudinary.config({ 
  secure: true 
});

// Configura o 'storage' (onde e como guardar)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'agora_avatars', // O nome da pasta no Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
    // Limita o tamanho e qualidade para o plano 'free'
    transformation: [{ width: 250, height: 250, crop: 'limit' }]
  }
});

// Cria o 'middleware' de upload
const upload = multer({ storage: storage });

module.exports = upload; // Exportamos o 'upload'