# Руководство по настройке MySQL для Encore Tasks

## Шаг 1: Установка MySQL

### Windows
1. Скачайте MySQL Community Server с официального сайта: https://dev.mysql.com/downloads/mysql/
2. Запустите установщик и следуйте инструкциям
3. Запомните пароль для пользователя `root`
4. MySQL будет доступен на порту 3306

### Альтернатива: Docker
```bash
docker run --name mysql-encore -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=encore_tasks -p 3306:3306 -d mysql:8.0
```

## Шаг 2: Создание базы данных

### Через MySQL Command Line
```sql
CREATE DATABASE encore_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'encore_user'@'localhost' IDENTIFIED BY 'encore_password';
GRANT ALL PRIVILEGES ON encore_tasks.* TO 'encore_user'@'localhost';
FLUSH PRIVILEGES;
```

### Через phpMyAdmin или MySQL Workbench
1. Создайте базу данных `encore_tasks`
2. Установите кодировку `utf8mb4_unicode_ci`

## Шаг 3: Настройка переменных окружения

Обновите файл `.env.local`:

```env
# Приоритет базы данных (mysql будет использоваться первым)
DATABASE_PRIORITY=mysql

# Настройки MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=encore_user
MYSQL_PASSWORD=encore_password
MYSQL_DATABASE=encore_tasks
MYSQL_SSL=false
MYSQL_CONNECTION_LIMIT=10
MYSQL_ACQUIRE_TIMEOUT=60000
MYSQL_TIMEOUT=60000

# Остальные настройки остаются без изменений
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Шаг 4: Инициализация схемы MySQL

```bash
# Перейдите в папку database
cd database

# Запустите инициализацию MySQL
node mysql-config.js
```

## Шаг 5: Миграция данных

```bash
# Вернитесь в корневую папку
cd ..

# Запустите скрипт миграции
node scripts/migrate-to-mysql.js
```

## Шаг 6: Перезапуск приложения

```bash
# Остановите текущий сервер (Ctrl+C)
# Запустите заново
npm run dev
```

## Проверка работы

1. Откройте http://localhost:3000
2. Попробуйте зарегистрироваться или войти
3. Создайте проект и задачи
4. Проверьте, что данные сохраняются в MySQL

## Устранение неполадок

### Ошибка подключения к MySQL
- Убедитесь, что MySQL сервер запущен
- Проверьте правильность настроек в `.env.local`
- Убедитесь, что пользователь имеет права доступа к базе данных

### Ошибки при миграции
- Убедитесь, что база данных пуста или содержит только схему
- Проверьте, что файл `database/temp-db.json` существует
- Запустите миграцию повторно

### Приложение использует tempDb вместо MySQL
- Проверьте логи в терминале на наличие ошибок подключения
- Убедитесь, что `DATABASE_PRIORITY=mysql` в `.env.local`
- Перезапустите приложение

## Мониторинг

Приложение автоматически переключается между базами данных в следующем порядке:
1. MySQL (если доступен и настроен)
2. PostgreSQL (если доступен)
3. tempDb (файловая система, резервный вариант)

Текущая база данных отображается в логах при запуске приложения.