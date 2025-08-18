# Руководство по миграции с SQLite на PostgreSQL

Это руководство поможет вам мигрировать проект Encore Tasks с SQLite на PostgreSQL.

## 📋 Обзор миграции

Миграция включает следующие компоненты:
- ✅ Создание PostgreSQL схемы базы данных
- ✅ Переписывание адаптера базы данных
- ✅ Обновление зависимостей (замена `better-sqlite3` на `pg`)
- ✅ Создание скрипта миграции данных
- ✅ Настройка Docker Compose для PostgreSQL

## 🚀 Быстрый старт

### 1. Установка PostgreSQL

#### Вариант A: Использование Docker (рекомендуется)
```bash
# Запуск PostgreSQL и pgAdmin
docker-compose -f docker-compose.postgresql.yml up -d

# Проверка статуса
docker-compose -f docker-compose.postgresql.yml ps
```

#### Вариант B: Локальная установка
Следуйте инструкциям в файле `POSTGRESQL_SETUP.md`

### 2. Настройка переменных окружения

```bash
# Скопируйте файл конфигурации
cp .env.postgresql .env

# Или настройте переменные вручную:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=encore_tasks
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_SSL=false
DATABASE_URL=postgresql://postgres:password@localhost:5432/encore_tasks
```

### 3. Инициализация схемы базы данных

```bash
# Подключитесь к PostgreSQL и выполните:
psql -h localhost -U postgres -d encore_tasks -f database/postgresql_schema.sql
```

### 4. Тестирование подключения

```bash
# Проверьте подключение к PostgreSQL
node test-postgresql-connection.js
```

### 5. Миграция данных (опционально)

Если у вас есть существующие данные в SQLite:

```bash
# Установите зависимости для миграции
npm install better-sqlite3 --save-dev

# Запустите миграцию
node scripts/migrate-sqlite-to-postgresql.js

# Удалите временную зависимость
npm uninstall better-sqlite3
```

### 6. Запуск приложения

```bash
# Установите зависимости
npm install

# Запустите приложение
npm run dev
```

## 📁 Структура файлов миграции

```
├── database/
│   └── postgresql_schema.sql          # Схема PostgreSQL
├── src/lib/
│   ├── postgresql-adapter.ts          # Адаптер PostgreSQL
│   └── database-adapter.ts            # Обновленный основной адаптер
├── scripts/
│   └── migrate-sqlite-to-postgresql.js # Скрипт миграции данных
├── backup-sqlite-2025-08-14-20-37-38/ # Резервная копия SQLite
├── .env.postgresql                    # Конфигурация PostgreSQL
├── docker-compose.postgresql.yml      # Docker Compose для PostgreSQL
└── test-postgresql-connection.js      # Тест подключения
```

## 🔧 Основные изменения

### Зависимости
- ❌ Удалено: `better-sqlite3`, `@types/better-sqlite3`
- ✅ Добавлено: `pg`, `@types/pg`

### Адаптер базы данных
- Создан новый `PostgreSQLAdapter` в `src/lib/postgresql-adapter.ts`
- Обновлен основной адаптер в `src/lib/database-adapter.ts`
- Все API маршруты автоматически используют новый адаптер

### Схема базы данных
- Адаптирована SQLite схема для PostgreSQL
- Добавлены автоинкрементные последовательности
- Настроены триггеры для автоматического обновления `updated_at`

## 🐛 Устранение неполадок

### Ошибка подключения
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Решение:** Убедитесь, что PostgreSQL запущен:
```bash
# Для Docker
docker-compose -f docker-compose.postgresql.yml up -d

# Для локальной установки
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

### База данных не существует
```
Error: database "encore_tasks" does not exist
```
**Решение:** Создайте базу данных:
```bash
creatdb encore_tasks
# или через psql:
psql -U postgres -c "CREATE DATABASE encore_tasks;"
```

### Ошибка аутентификации
```
Error: password authentication failed
```
**Решение:** Проверьте настройки в `.env` файле и убедитесь, что пользователь и пароль корректны.

## 📊 Проверка миграции

После миграции проверьте:

1. **Подключение к базе данных:**
   ```bash
   node test-postgresql-connection.js
   ```

2. **Запуск приложения:**
   ```bash
   npm run dev
   ```

3. **Функциональность:**
   - Регистрация/вход пользователей
   - Создание проектов и досок
   - Управление задачами

## 🔄 Откат к SQLite

Если необходимо вернуться к SQLite:

1. Восстановите файлы из резервной копии:
   ```bash
   cp backup-sqlite-2025-08-14-20-37-38/* src/lib/
   ```

2. Обновите зависимости:
   ```bash
   npm uninstall pg @types/pg
   npm install better-sqlite3 @types/better-sqlite3
   ```

3. Восстановите конфигурацию:
   ```bash
   cp .env.example .env
   ```

## 📞 Поддержка

Если у вас возникли проблемы:
1. Проверьте логи приложения
2. Убедитесь, что все зависимости установлены
3. Проверьте настройки подключения к базе данных
4. Обратитесь к разделу "Устранение неполадок" выше

---

**Примечание:** Данная миграция была выполнена автоматически. Все оригинальные SQLite файлы сохранены в папке резервного копирования.