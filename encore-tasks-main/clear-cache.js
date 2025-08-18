// Скрипт для очистки кэша браузера
console.log('Очистка localStorage...');
localStorage.clear();
console.log('localStorage очищен');

console.log('Очистка sessionStorage...');
sessionStorage.clear();
console.log('sessionStorage очищен');

console.log('Перезагрузка страницы...');
window.location.reload(true);