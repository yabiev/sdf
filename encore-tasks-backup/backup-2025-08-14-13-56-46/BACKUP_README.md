# Резервная копия системы управления проектами, досками и задачами

**Дата создания:** 14 августа 2025, 13:56:46

## Содержимое бэкапа

### UI Компоненты
- `CreateProjectModal.tsx` - Модальное окно создания проекта
- `KanbanBoard.tsx` - Основная доска Kanban
- `CreateTaskModal.tsx` - Модальное окно создания задачи
- `BoardManager.tsx` - Менеджер досок
- `TaskCard.tsx` - Карточка задачи
- `TaskModal.tsx` - Модальное окно задачи
- `CreateBoardModal.tsx` - Модальное окно создания доски

### API Маршруты
- `projects/` - API для управления проектами
- `boards/` - API для управления досками
- `tasks/` - API для управления задачами

### Сервисы и логика
- `services/` - Все сервисы системы (BoardService, TaskService, etc.)
- `AppContext.tsx` - Основной контекст приложения
- `sqlite-adapter-optimized.ts` - Оптимизированный адаптер SQLite
- `database-adapter.ts` - Основной адаптер базы данных

## Инструкции по восстановлению

### Полное восстановление
1. Остановите сервер разработки
2. Скопируйте файлы из этого бэкапа обратно в соответствующие директории:
   ```powershell
   # Компоненты
   Copy-Item -Path "*.tsx" -Destination "../src/components/" -Force
   
   # API маршруты
   Copy-Item -Path "projects", "boards", "tasks" -Destination "../src/app/api/" -Recurse -Force
   
   # Сервисы и контексты
   Copy-Item -Path "services" -Destination "../src/" -Recurse -Force
   Copy-Item -Path "AppContext.tsx" -Destination "../src/contexts/" -Force
   Copy-Item -Path "sqlite-adapter-optimized.ts", "database-adapter.ts" -Destination "../src/lib/" -Force
   ```
3. Перезапустите сервер разработки

### Частичное восстановление
Вы можете восстановить отдельные компоненты, скопировав только нужные файлы.

## Важные замечания
- Этот бэкап содержит только код, не включает базу данных
- Перед восстановлением убедитесь, что новая система не работает корректно
- Рекомендуется создать дополнительный бэкап перед восстановлением

## Архитектура сохраненной системы

### Основные проблемы старой системы:
1. Нестабильная работа компонентов
2. Проблемы с синхронизацией состояния
3. Неоптимальная структура сервисов
4. Сложные зависимости между компонентами

### Структура компонентов:
- **Проекты**: CreateProjectModal.tsx + API projects/
- **Доски**: BoardManager.tsx, CreateBoardModal.tsx + API boards/
- **Задачи**: KanbanBoard.tsx, TaskCard.tsx, TaskModal.tsx, CreateTaskModal.tsx + API tasks/
- **Состояние**: AppContext.tsx (централизованное управление)
- **Данные**: sqlite-adapter-optimized.ts (работа с БД)