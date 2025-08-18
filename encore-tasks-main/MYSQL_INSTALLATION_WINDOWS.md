# Установка MySQL на Windows

## Вариант 1: MySQL Community Server (Рекомендуется)

### Шаг 1: Скачивание
1. Перейдите на https://dev.mysql.com/downloads/mysql/
2. Выберите "Windows (x86, 64-bit), MSI Installer"
3. Скачайте файл (например, `mysql-installer-community-8.0.xx.x.msi`)

### Шаг 2: Установка
1. Запустите скачанный MSI файл
2. Выберите "Developer Default" или "Server only"
3. Следуйте инструкциям установщика
4. **Важно**: Запомните пароль для пользователя `root`

### Шаг 3: Настройка
1. После установки MySQL будет запущен как служба Windows
2. Откройте MySQL Command Line Client или MySQL Workbench
3. Войдите с пользователем `root` и паролем, который вы установили

### Шаг 4: Создание базы данных
```sql
CREATE DATABASE encore_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Вариант 2: XAMPP (Простой способ)

### Шаг 1: Скачивание XAMPP
1. Перейдите на https://www.apachefriends.org/download.html
2. Скачайте XAMPP для Windows

### Шаг 2: Установка
1. Запустите установщик
2. Выберите компоненты: Apache, MySQL, PHP, phpMyAdmin
3. Установите в папку по умолчанию (C:\xampp)

### Шаг 3: Запуск
1. Откройте XAMPP Control Panel
2. Нажмите "Start" рядом с MySQL
3. MySQL будет доступен на порту 3306

### Шаг 4: Создание базы данных через phpMyAdmin
1. Откройте http://localhost/phpmyadmin
2. Создайте новую базу данных `encore_tasks`
3. Установите кодировку `utf8mb4_unicode_ci`

## Проверка установки

### Через командную строку:
```cmd
mysql -u root -p
```

## Настройка для Encore Tasks

### Обновите .env.local:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=ваш_пароль_root
MYSQL_DATABASE=encore_tasks
```

### Запустите инициализацию:
```bash
node database/mysql-config.js
node scripts/migrate-to-mysql.js
```

## Альтернатива: Продолжить с tempDb

Если установка MySQL вызывает сложности, приложение будет продолжать работать с файловой системой (tempDb). Все функции доступны.