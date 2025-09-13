import { createClient } from '@supabase/supabase-js';

async function testColumnsStructure() {
  const supabaseUrl = 'https://euxwfktskphfspcaqhfz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHdma3Rza3BoZnNwY2FxaGZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI0NTM1NywiZXhwIjoyMDcyODIxMzU3fQ.QAWk6Z4jOC52eXchMJbC5uXXRbJ0aPIKPmvCGURH_SE';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('🔍 Checking columns table structure...');
    
    // Проверяем структуру таблицы columns
    const { data: structure, error: structureError } = await supabase
      .rpc('get_table_structure', { table_name: 'columns' });
    
    if (structureError) {
      console.log('⚠️ RPC function not available, trying direct query...');
      
      // Альтернативный способ - прямой запрос к таблице
      const { data: sampleData, error: dataError } = await supabase
        .from('columns')
        .select('*')
        .limit(1);
      
      if (dataError) {
        console.error('❌ Error querying columns table:', dataError);
        return;
      }
      
      console.log('\n📋 Sample columns table data:');
      if (sampleData && sampleData.length > 0) {
        console.log('Available fields:', Object.keys(sampleData[0]));
        console.log('Sample row:', sampleData[0]);
      } else {
        console.log('No data found in columns table');
      }
    } else {
      console.log('\n📋 Columns table structure:', structure);
    }
    
    // Проверяем, есть ли данные в таблице
    const { data: allData, error: allDataError } = await supabase
      .from('columns')
      .select('*')
      .limit(5);
    
    if (allDataError) {
      console.error('❌ Error fetching data:', allDataError);
    } else {
      console.log(`\n📊 Sample data (${allData.length} rows):`);
      allData.forEach((row, index) => {
        console.log(`  Row ${index + 1}:`, row);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testColumnsStructure();