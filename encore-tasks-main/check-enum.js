const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks',
  password: 'postgres',
  port: 5432,
});

async function checkEnum() {
  try {
    console.log('Checking UserRole enum values...');
    
    // Check if UserRole enum exists
    const enumQuery = `
      SELECT unnest(enum_range(NULL::UserRole)) AS role_values
    `;
    
    const result = await pool.query(enumQuery);
    console.log('UserRole enum values:');
    result.rows.forEach(row => {
      console.log('- ' + row.role_values);
    });
    
  } catch (error) {
    console.error('Error checking enum:', error.message);
    
    // Try alternative approach - check enum definition
    try {
      const altQuery = `
        SELECT e.enumlabel as enum_value
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'UserRole'
        ORDER BY e.enumsortorder
      `;
      
      const altResult = await pool.query(altQuery);
      console.log('\nUserRole enum values (alternative method):');
      altResult.rows.forEach(row => {
        console.log('- ' + row.enum_value);
      });
      
    } catch (altError) {
      console.error('Alternative method also failed:', altError.message);
      
      // Check what enums exist
      try {
        const enumsQuery = `
          SELECT t.typname as enum_name
          FROM pg_type t 
          WHERE t.typtype = 'e'
          ORDER BY t.typname
        `;
        
        const enumsResult = await pool.query(enumsQuery);
        console.log('\nAvailable enums in database:');
        enumsResult.rows.forEach(row => {
          console.log('- ' + row.enum_name);
        });
        
      } catch (enumsError) {
        console.error('Failed to list enums:', enumsError.message);
      }
    }
  } finally {
    await pool.end();
  }
}

checkEnum();