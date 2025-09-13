const { databaseAdapter } = require('./src/lib/database-adapter.ts');

async function checkColumns() {
  try {
    await databaseAdapter.initialize();
    console.log('Database connected successfully');
    
    const columns = await databaseAdapter.query('SELECT id, name, board_id FROM columns LIMIT 10');
    console.log('Existing columns:', columns);
    
    const boards = await databaseAdapter.query('SELECT id, name FROM boards LIMIT 5');
    console.log('Existing boards:', boards);
    
    const projects = await databaseAdapter.query('SELECT id, name FROM projects LIMIT 5');
    console.log('Existing projects:', projects);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkColumns();