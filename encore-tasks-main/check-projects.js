import Database from 'better-sqlite3';

const db = new Database('./database.sqlite');

console.log('📊 Проверка проектов в базе данных:');
console.log('=' .repeat(50));

try {
  // Получаем все проекты
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  
  console.log(`Всего проектов в базе: ${projects.length}`);
  console.log('');
  
  if (projects.length === 0) {
    console.log('❌ Проекты не найдены в базе данных');
  } else {
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ID: ${project.id}`);
      console.log(`   Название: ${project.name}`);
      console.log(`   Описание: ${project.description || 'Нет описания'}`);
      console.log(`   Цвет: ${project.color}`);
      console.log(`   Владелец: ${project.owner_id}`);
      console.log(`   Создан: ${project.created_at}`);
      console.log(`   Обновлен: ${project.updated_at}`);
      console.log('---');
    });
  }
  
  // Проверяем последние 5 проектов
  console.log('\n🕒 Последние 5 проектов:');
  const recentProjects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT 5').all();
  
  recentProjects.forEach((project, index) => {
    console.log(`${index + 1}. ${project.name} (${project.created_at})`);
  });
  
} catch (error) {
  console.error('Ошибка при проверке проектов:', error.message);
} finally {
  db.close();
}