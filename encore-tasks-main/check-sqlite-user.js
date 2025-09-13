const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

console.log('Starting SQLite user check...');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('Database path:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database successfully');
  }
});

// Check if users table exists
console.log('Checking if users table exists...');
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
  if (err) {
    console.error('Error checking table:', err.message);
    db.close();
    return;
  }
  
  if (!row) {
    console.log('Users table does not exist');
    // List all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('Error listing tables:', err.message);
      } else {
        console.log('Available tables:', tables);
      }
      db.close();
    });
    return;
  }
  
  console.log('Users table exists');
  
  // Look for specific user
  console.log('Looking for user axelencore@mail.ru...');
  db.get("SELECT * FROM users WHERE email = ?", ['axelencore@mail.ru'], (err, user) => {
    if (err) {
      console.error('Error finding user:', err.message);
      db.close();
      return;
    }
    
    if (user) {
      console.log('User found:', user);
      
      // Check password
      console.log('Checking password...');
      bcrypt.compare('Ad580dc6axelencore', user.password_hash, (err, result) => {
        if (err) {
          console.error('Error checking password:', err.message);
        } else {
          console.log('Password match:', result);
        }
        
        // List all users after password check
        listAllUsers();
      });
    } else {
      console.log('User axelencore@mail.ru not found');
      listAllUsers();
    }
  });
});

function listAllUsers() {
  console.log('Listing all users...');
  db.all("SELECT id, email, name, approval_status FROM users", (err, users) => {
    if (err) {
      console.error('Error listing users:', err.message);
    } else {
      console.log('All users:', users);
      console.log('Total users count:', users.length);
    }
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  });
}