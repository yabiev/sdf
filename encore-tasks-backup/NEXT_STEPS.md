# Следующие шаги для завершения миграции на MySQL

## Текущее состояние
✅ Код приложения успешно мигрирован на использование DatabaseAdapter  
✅ MySQL схема и конфигурация готовы  
✅ Зависимости установлены  
⚠️ MySQL сервер не настроен (приложение использует tempDb fallback)

## Что нужно сделать

### 1. Установить и настроить MySQL сервер

**Вариант A: Установка MySQL Community Server**
- Скачайте с https://dev.mysql.com/downloads/mysql/
- Установите и запустите сервер
- Создайте базу данных `encore_tasks`

**Вариант B: Использование Docker (рекомендуется)**
```bash
docker run --name mysql-encore -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=encore_tasks -p 3306:3306 -d mysql:8.0
```

### 2. Обновить настройки в .env.local

Убедитесь, что настройки MySQL соответствуют вашему серверу:
```env
DATABASE_PRIORITY=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=encore_tasks
```

### 3. Инициализировать схему и мигрировать данные

```bash
# Инициализация схемы MySQL
node database/mysql-config.js

# Миграция данных из temp-db.json
node scripts/migrate-to-mysql.js

# Перезапуск приложения
npm run dev
```

### 4. Проверить работу

После успешной настройки в логах должно появиться:
```
✅ MySQL подключен успешно
```

Вместо:
```
⚠️ PostgreSQL недоступен, используется tempDb fallback
```

## Альтернативный вариант

Если вы не хотите настраивать MySQL прямо сейчас, приложение будет продолжать работать с файловой системой (tempDb). Все функции доступны, но производительность будет ниже.

## Помощь

Подробные инструкции см. в файле `MYSQL_SETUP_GUIDE.md`