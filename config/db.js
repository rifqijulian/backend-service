const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port:3307,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('Gagal terhubung ke database:', err);
  } else {
    console.log('Berhasil terhubung ke database MySQL!');
    connection.release();
  }
});

module.exports = db.promise();
