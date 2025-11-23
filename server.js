const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Create SQLite DB
const db = new sqlite3.Database("./database.db");

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    fullName TEXT,
    balance REAL DEFAULT 0,
    role TEXT,
    isLocked INTEGER DEFAULT 0,
    createdAt TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS fundHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    type TEXT,
    amount REAL,
    method TEXT,
    trxId TEXT,
    timestamp TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    username TEXT,
    type TEXT,
    amount REAL,
    method TEXT,
    details TEXT,
    status TEXT,
    timestamp TEXT
  )
`);

/* ------------------------ API ROUTES ------------------------ */

// LOGIN
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.get(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password],
        (err, row) => {
            if (row) res.json({ status: "success", user: row });
            else res.json({ status: "error", message: "Invalid login" });
        }
    );
});

// CREATE USER
app.post("/create-user", (req, res) => {
    const { username, password, fullName, balance } = req.body;

    db.run(
        `INSERT INTO users (username, password, fullName, balance, role, createdAt)
         VALUES (?, ?, ?, ?, 'user', datetime('now'))`,
        [username, password, fullName, balance],
        function (err) {
            if (err) return res.json({ status: "error", message: "Username exists" });
            res.json({ status: "success", id: this.lastID });
        }
    );
});

// GET ALL USERS
app.get("/users", (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        res.json(rows);
    });
});

// DEPOSIT / WITHDRAW UPDATE
app.post("/update-balance", (req, res) => {
    const { userId, amount } = req.body;

    db.run(
        "UPDATE users SET balance = balance + ? WHERE id = ?",
        [amount, userId],
        (err) => {
            if (err) res.json({ status: "error" });
            else res.json({ status: "success" });
        }
    );
});

// SAVE FUND HISTORY
app.post("/add-history", (req, res) => {
    const { userId, type, amount, method, trxId } = req.body;

    db.run(
        `INSERT INTO fundHistory (userId, type, amount, method, trxId, timestamp)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [userId, type, amount, method, trxId],
        () => res.json({ status: "success" })
    );
});

// GET FUND HISTORY
app.get("/history", (req, res) => {
    db.all("SELECT * FROM fundHistory ORDER BY id DESC", [], (err, rows) => {
        res.json(rows);
    });
});

// ------------------------ SERVER START -------------------------
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

const res = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
});
const data = await res.json();

await fetch("http://localhost:3000/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        username, password, fullName, balance
    })
});

await fetch("http://localhost:3000/update-balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, amount })
});
