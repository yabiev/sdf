const Database = require('better-sqlite3');

try {
  const db = new Database('./database.sqlite');
  
  console.log('=== project_members table schema ===');
  const info = db.prepare('PRAGMA table_info(project_members)').all();
  
  if (info.length === 0) {
    console.log('Table project_members does not exist!');
  } else {
    console.log('Columns:');
    info.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check for joined_at column specifically
    const hasJoinedAt = info.some(col => col.name === 'joined_at');
    console.log(`\njoined_at column exists: ${hasJoinedAt}`);
  }
  
  db.close();
  console.log('\nDatabase connection closed.');
} catch (error) {
  console.error('Error:', error.message);
}