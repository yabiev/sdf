const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

async function createBasicTables() {
  try {
    console.log('Creating basic tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created');
    
    // Create sessions table (using 'sessions' instead of 'user_sessions')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Sessions table created');
    
    // Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        owner_id INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Projects table created');
    
    // Create boards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        project_id INTEGER NOT NULL,
        position INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Boards table created');
    
    // Create columns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS columns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        board_id INTEGER NOT NULL,
        position INTEGER DEFAULT 0,
        color VARCHAR(7) DEFAULT '#6B7280',
        task_limit INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Columns table created');
    
    // Create tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        project_id INTEGER NOT NULL,
        board_id INTEGER,
        column_id INTEGER,
        assignee_id INTEGER,
        reporter_id INTEGER NOT NULL,
        parent_task_id INTEGER,
        position INTEGER DEFAULT 0,
        story_points INTEGER,
        estimated_hours DECIMAL(8,2),
        actual_hours DECIMAL(8,2),
        deadline TIMESTAMP WITH TIME ZONE,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE SET NULL,
        FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE SET NULL,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Tasks table created');
    
    console.log('\nAll basic tables created successfully!');
    
    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nCreated tables:');
    tablesResult.rows.forEach(row => {
      console.log('- ' + row.table_name);
    });
    
    // Create admin user
    console.log('\nCreating admin user...');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Ad580dc6axelencore', 12);
    
    try {
      // Check if admin user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        ['axelencore@mail.ru']
      );
      
      if (existingUser.rows.length > 0) {
        // Update existing user
        await pool.query(`
          UPDATE users SET
            password_hash = $1,
            role = $2,
            name = $3
          WHERE email = $4
        `, [passwordHash, 'admin', 'Admin User', 'axelencore@mail.ru']);
        
        console.log('✓ Admin user updated successfully');
      } else {
        // Create new user
        await pool.query(`
          INSERT INTO users (name, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
        `, ['Admin User', 'axelencore@mail.ru', passwordHash, 'admin']);
        
        console.log('✓ Admin user created successfully');
      }
      
      // Show admin user info
      const adminUser = await pool.query(
        'SELECT id, email, name, role FROM users WHERE email = $1',
        ['axelencore@mail.ru']
      );
      
      console.log('Admin user info:', adminUser.rows[0]);
      
    } catch (error) {
      console.error('✗ Error creating admin user:', error.message);
    }
    
  } catch (error) {
    console.error('Table creation failed:', error);
  } finally {
    await pool.end();
  }
}

createBasicTables();