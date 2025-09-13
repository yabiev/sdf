const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Используем существующий JWT токен из базы данных
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhNzM5NTI2NC1hZTk3LTQ2NmQtOGRkMy02NTQxMGE3MjY2YWEiLCJlbWFpbCI6ImF4ZWxlbmNvckBtYWlsLnJ1Iiwicm9sZSI6InVzZXIiLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNzU2MjI3Njc3LCJleHAiOjE3NTYzMTQwNzd9.OfBhmIk9kyakxlQfdBD9z1HJZP9_XnzjN6RUyDXxZgE';

// Данные для создания задачи
const taskData = {
  title: 'Тестовая задача',
  description: 'Описание тестовой задачи для проверки API',
  column_id: 'b9ddb7e0-cca9-440c-a590-aec137130ba3', // ID колонки 'К выполнению'
  status: 'todo',
  priority: 'medium'
};

console.log('Отправляем POST запрос на /api/tasks...');
console.log('Данные задачи:', taskData);
console.log('Токен:', token);

fetch('http://localhost:3000/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(taskData)
})
.then(response => {
  console.log('Статус ответа:', response.status);
  console.log('Заголовки ответа:', response.headers.raw());
  return response.text();
})
.then(data => {
  console.log('Тело ответа:', data);
  try {
    const jsonData = JSON.parse(data);
    if (jsonData.success) {
      console.log('✅ УСПЕШНО: Задача создана с ID:', jsonData.data.id);
    } else {
      console.log('❌ ОШИБКА:', jsonData.error);
    }
  } catch (e) {
    console.log('Не удалось распарсить JSON ответ');
  }
})
.catch(error => {
  console.error('Ошибка запроса:', error);
});