const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'encore_tasks_db',
  user: 'postgres',
  password: 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function updateDatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Updating database schema...');
    
    // Check if projects table has owner_id column
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'owner_id'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('Found owner_id column, renaming to creator_id...');
      
      // Rename owner_id to creator_id
      await client.query('ALTER TABLE projects RENAME COLUMN owner_id TO creator_id');
      console.log('✓ Renamed owner_id to creator_id in projects table');
      
      // Drop old index if exists
      await client.query('DROP INDEX IF EXISTS idx_projects_owner');
      console.log('✓ Dropped old index idx_projects_owner');
      
      // Create new index
      await client.query('CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(creator_id)');
      console.log('✓ Created new index on creator_id');
    } else {
      console.log('owner_id column not found, checking for creator_id...');
      
      const checkCreatorId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'creator_id'
      `);
      
      if (checkCreatorId.rows.length > 0) {
        console.log('✓ creator_id column already exists');
      } else {
        console.log('Neither owner_id nor creator_id found. This might be a different issue.');
      }
    }
    
    // Verify the current schema
    const schema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);
    
    console.log('\nCurrent projects table schema:');
    schema.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\nDatabase schema update completed successfully!');
    
  } catch (error) {
    console.error('Error updating database schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateDatabaseSchema().catch(console.error);