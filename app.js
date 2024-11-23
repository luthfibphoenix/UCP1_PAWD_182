const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const PORT = 3002;
 
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(
  session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
  })
);

// Koneksi ke MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'rumahsakit',
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Middleware untuk Proteksi Rute
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
// Homepage
app.get('/', isAuthenticated, (req, res) => {
    // Debugging: Pastikan sesi pengguna ada
    console.log('Session User:', req.session.user);
  
    const query = 'SELECT * FROM data';
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Database query error' });
      } else {
        // Debugging: Periksa hasil dari database
        console.log('Data from DB:', results);
        res.render('read', { dbData: results, user: req.session.user });
      }
    });
});
  

// Login Page
app.get('/login', (req, res) => {
  res.render('login');
});

// Handle Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], async (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.session.user = { id: user.id, username: user.username };
        res.redirect('/');
      } else {
        res.send('Password salah!');
      }
    } else {
      res.send('Username tidak ditemukan!');
    }
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Register Page
app.get('/register', (req, res) => {
  res.render('register');
});

// Handle Registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(query, [username, hashedPassword], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        res.send('Username sudah digunakan!');
      } else {
        throw err;
      }
    } else {
      res.redirect('/login');
    }
  });
});

// Tambah Data
app.get('/add', isAuthenticated, (req, res) => {
  res.render('create');
});

app.post('/add', isAuthenticated, (req, res) => {
  const { name, age, diagnosis } = req.body;
  const query = 'INSERT INTO data (name, age, diagnosis) VALUES (?, ?, ?)';
  db.query(query, [name, age, diagnosis], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

// Edit Data
app.get('/edit/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;
  const query = 'SELECT * FROM data WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) throw err;
    res.render('edit', { item: results[0] });
  });
});

app.post('/edit/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;
  const { name, age, diagnosis } = req.body;
  const query = 'UPDATE data SET name = ?, age = ?, diagnosis = ? WHERE id = ?';
  db.query(query, [name, age, diagnosis, id], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

// Hapus Data
app.post('/delete/:id', isAuthenticated, (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM data WHERE id = ?';
    db.query(query, [id], (err) => {
      if (err) throw err;
      res.redirect('/');
    });
  });

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
