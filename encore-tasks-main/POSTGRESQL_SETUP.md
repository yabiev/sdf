# Настройка PostgreSQL для Encore Tasks

Для полноценной работы приложения необходимо установить и настроить PostgreSQL.

## Вариант 1: Установка PostgreSQL локально

### Windows
1. Скачайте PostgreSQL с официального сайта: https://www.postgresql.org/download/windows/
2. Запустите установщик и следуйте инструкциям
3. Запомните пароль для пользователя `postgres`
4. После установки PostgreSQL будет доступен на порту 5432

### Создание базы данных
1. Откройте pgAdmin или командную строку PostgreSQL
2. Создайте базу данных:
```sql
CREATE DATABASE encore_tasks;
```

### Настройка переменных окружения
Обновите файл `.env.local` с вашими настройками:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=encore_tasks
DB_USER=postgres
DB_PASSWORD=ваш_пароль
```

## Вариант 2: Использование Docker

### Установка Docker
1. Скачайте Docker Desktop: https://www.docker.com/products/docker-desktop
2. Установите и запустите Docker

### Запуск PostgreSQL в контейнере
```bash
docker run --name postgres-encore \
  -e POSTGRES_DB=encore_tasks \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15
```

## Миграция базы данных

После настройки PostgreSQL выполните миграцию:

```bash
cd database
npm install
node migrate.js
```

## Заполнение тестовыми данными (опционально)

```bash
node scripts/seed.js
```

## Проверка подключения

После настройки перезапустите приложение:
```bash
npm run dev
```

Вы должны увидеть сообщение "✅ PostgreSQL подключен успешно" в консоли.

## Устранение неполадок

### Ошибка подключения (ECONNREFUSED)
- Убедитесь, что PostgreSQL запущен
- Проверьте настройки в `.env.local`
- Убедитесь, что порт 5432 не заблокирован

### Ошибка аутентификации
- Проверьте правильность пароля в `.env.local`
- Убедитесь, что пользователь `postgres` существует

### База данных не найдена
- Создайте базу данных `encore_tasks` вручную
- Выполните миграции