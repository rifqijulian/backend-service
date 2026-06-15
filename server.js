const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./config/db');
const verifikasiToken = require('./middleware/authMiddleware');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Jalur dasar untuk cek koneksi awal
app.get('/', (req, res) => {
  res.json({ pesan: 'Mesin API Pengingat Servis Motor berhasil menyala!' });
});

// ================= RUTE AUTENTIKASI =================

// 1. Registrasi Akun
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nama, email, password } = req.body;
    
    const [penggunaLama] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (penggunaLama.length > 0) {
      return res.status(400).json({ pesan: 'Email sudah terdaftar!' });
    }

    const salt = await bcrypt.genSalt(10);
    const kataSandiAcak = await bcrypt.hash(password, salt);

    await db.query('INSERT INTO users (nama, email, password) VALUES (?, ?, ?)', [nama, email, kataSandiAcak]);
    
    res.status(201).json({ pesan: 'Registrasi berhasil, silakan login!' });
  } catch (error) {
    res.status(500).json({ pesan: 'Terjadi kesalahan pada server', error: error.message });
  }
});

// 2. Login Akun
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [pengguna] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (pengguna.length === 0) {
      return res.status(404).json({ pesan: 'Email tidak ditemukan!' });
    }

    const sandiCocok = await bcrypt.compare(password, pengguna[0].password);
    if (!sandiCocok) {
      return res.status(401).json({ pesan: 'Kata sandi salah!' });
    }

    const token = jwt.sign({ id: pengguna[0].id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ pesan: 'Login berhasil!', token });
  } catch (error) {
    res.status(500).json({ pesan: 'Terjadi kesalahan pada server', error: error.message });
  }
});

// ================= RUTE CRUD SERVIS MOTOR (WAJIB LOGIN) =================

// 1. CREATE: Menambah Jadwal Servis Baru
app.post('/api/servis', verifikasiToken, async (req, res) => {
  try {
    const { nama_motor, plat_nomor, jenis_servis, harga, tanggal_servis, tanggal_berikutnya, status } = req.body;
    const userId = req.pengguna.id; // Diambil otomatis dari token login

    const queryInput = 'INSERT INTO servis_motor (user_id, nama_motor, plat_nomor, jenis_servis, harga, tanggal_servis, tanggal_berikutnya, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    await db.query(queryInput, [userId, nama_motor, plat_nomor, jenis_servis, harga || 0, tanggal_servis, tanggal_berikutnya, status]);

    res.status(201).json({ pesan: 'Jadwal servis motor berhasil ditambahkan!' });
  } catch (error) {
    res.status(500).json({ pesan: 'Gagal menambah data', error: error.message });
  }
});

// 2. READ: Mengambil Semua Daftar Servis Milik Pengguna Yang Sedang Login
app.get('/api/servis', verifikasiToken, async (req, res) => {
  try {
    const userId = req.pengguna.id;
    const [daftarServis] = await db.query('SELECT * FROM servis_motor WHERE user_id = ?', [userId]);
    
    res.json(daftarServis);
  } catch (error) {
    res.status(500).json({ pesan: 'Gagal mengambil data', error: error.message });
  }
});

// 3. UPDATE: Mengubah Data atau Status Servis Motor
app.put('/api/servis/:id', verifikasiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.pengguna.id;
    const { nama_motor, plat_nomor, jenis_servis, harga, tanggal_servis, tanggal_berikutnya, status } = req.body;

    const queryUpdate = 'UPDATE servis_motor SET nama_motor = ?, plat_nomor = ?, jenis_servis = ?, harga = ?, tanggal_servis = ?, tanggal_berikutnya = ?, status = ? WHERE id = ? AND user_id = ?';
    const [hasil] = await db.query(queryUpdate, [nama_motor, plat_nomor, jenis_servis, harga || 0, tanggal_servis, tanggal_berikutnya, status, id, userId]);

    if (hasil.affectedRows === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan atau kamu tidak memiliki akses!' });
    }

    res.json({ pesan: 'Jadwal servis berhasil diperbarui!' });
  } catch (error) {
    res.status(500).json({ pesan: 'Gagal memperbarui data', error: error.message });
  }
});

// 4. DELETE: Menghapus Catatan Servis Motor
app.delete('/api/servis/:id', verifikasiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.pengguna.id;

    const [hasil] = await db.query('DELETE FROM servis_motor WHERE id = ? AND user_id = ?', [id, userId]);

    if (hasil.affectedRows === 0) {
      return res.status(404).json({ pesan: 'Data tidak ditemukan atau kamu tidak memiliki akses!' });
    }

    res.json({ pesan: 'Catatan servis berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ pesan: 'Gagal menghapus data', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server aktif dan mendengarkan di port ${port}`);
});
