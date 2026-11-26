require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('./db');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

(async () => {
  try {
    const name = (await ask('Administrator full name: ')).trim();
    const email = (await ask('Administrator email: ')).trim().toLowerCase();
    const password = await ask('Administrator password (minimum 8 characters): ');
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      throw new Error('Provide a name, valid email and password of at least 8 characters.');
    }
    const hash = await bcrypt.hash(password, 12);
    await db.execute(
      "INSERT INTO users (full_name,email,password_hash,role) VALUES (?,?,?,'admin')",
      [name, email, hash]
    );
    console.log('Administrator account created. Keep the login details private.');
  } catch (err) { console.error(err.message); process.exitCode = 1; }
  finally { rl.close(); await db.end(); }
})();
