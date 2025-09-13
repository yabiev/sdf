const fs = require('fs');
const path = require('path');

// Список файлов для исправления
const filesToFix = [
  'src/app/api/projects/route.ts',
  'src/app/api/auth/logout/route.ts',
  'src/app/api/columns/[id]/route.ts',
  'src/app/api/users/route.ts',
  'src/app/api/boards/[id]/route.ts',
  'src/app/api/projects/[id]/route.ts',
  'src/lib/auth.ts',
  'src/app/api/auth/me/route.ts',
  'src/app/api/tasks/[id]/route.ts',
  'src/app/api/tasks/route.ts',
  'src/app/api/users/[id]/route.ts',
  'src/app/api/boards/route.ts'
];

function fixImports() {
  console.log('🔧 Исправление импортов database adapter...');
  
  filesToFix.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Файл не найден: ${filePath}`);
      return;
    }
    
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Проверяем, есть ли неправильный импорт
      if (content.includes('dbAdapter as databaseAdapter')) {
        console.log(`📝 Исправление: ${filePath}`);
        
        // Заменяем импорт
        if (filePath.includes('src/lib/auth.ts')) {
          // Для auth.ts используем относительный путь
          content = content.replace(
            "import { dbAdapter as databaseAdapter } from './database-adapter';",
            "import { DatabaseAdapter } from './database-adapter';\n\nconst databaseAdapter = DatabaseAdapter.getInstance();"
          );
        } else {
          // Для остальных файлов используем абсолютный путь
          content = content.replace(
            "import { dbAdapter as databaseAdapter } from '@/lib/database-adapter';",
            "import { DatabaseAdapter } from '@/lib/database-adapter';\n\nconst databaseAdapter = DatabaseAdapter.getInstance();"
          );
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Исправлен: ${filePath}`);
      } else {
        console.log(`✅ Уже исправлен: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при обработке ${filePath}:`, error.message);
    }
  });
  
  console.log('🎉 Исправление импортов завершено!');
}

fixImports();