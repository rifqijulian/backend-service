const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifikasiToken = (req, res, next) => {
  const headerOtorisasi = req.header('Authorization');
  
  if (!headerOtorisasi) {
    return res.status(401).json({ pesan: 'Akses ditolak, token tidak tersedia!' });
  }

  try {
    const token = headerOtorisasi.replace('Bearer ', '');
    const verifikasi = jwt.verify(token, process.env.JWT_SECRET);
    req.pengguna = verifikasi;
    next();
  } catch (error) {
    res.status(400).json({ pesan: 'Token tidak valid!' });
  }
};

module.exports = verifikasiToken;
