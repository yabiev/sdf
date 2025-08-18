import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';
import { databaseAdapter } from '@/lib/database-adapter-optimized';

// Схемы валидации
const createTaskSchema = z.object({
  title: z.string().min(1, 'Название задачи обязательно').max(255, 'Название слишком длинное'),
  description: z.string().optional(),
  columnId: z.number().min(1, 'ID колонки обязателен'),
  status: z.enum(['todo', 'in-progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigneeId: z.number().optional(),
  position: z.number().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().optional(),
    type: z.string().optional()
  })).default([]),
  customFields: z.record(z.any()).optional()
});

const updateTaskSchema = createTaskSchema.partial().omit({ columnId: true });

const querySchema = z.object({
  columnId: z.coerce.number().optional(),
  boardId: z.coerce.number().optional(),
  projectId: z.coerce.number().optional(),
  assigneeId: z.coerce.number().optional(),
  reporterId: z.coerce.number().optional(),
  status: z.enum(['todo', 'in-progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'status', 'priority', 'created_at', 'updated_at', 'due_date', 'position']).default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeArchived: z.coerce.boolean().default(false),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  tags: z.string().optional() // comma-separated tags
});

const moveTaskSchema = z.object({
  columnId: z.number().min(1, 'ID колонки обязателен'),
  position: z.number().min(0, 'Позиция должна быть неотрицательной')
});

// Типы ответов
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Утилиты
function createSuccessResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, message });
}

function createErrorResponse(error: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

function createPaginationResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

// Утилита для проверки доступа к задаче
async function checkTaskAccess(userId: number, taskId: number): Promise<boolean> {
  try {
    const task = await databaseAdapter.getTaskById(taskId);
    if (!task) return false;
    
    // Получаем информацию о колонке и доске
    const column = await databaseAdapter.getColumnById(task.column_id);
    if (!column) return false;
    
    const board = await databaseAdapter.getBoardById(column.board_id);
    if (!board) return false;
    
    // Проверяем доступ к проекту
    return await databaseAdapter.hasProjectAccess(userId, board.project_id.toString());
  } catch (error) {
    console.error('Ошибка проверки доступа к задаче:', error);
    return false;
  }
}

// GET /api/v2/tasks - Получение списка задач
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    
    // Валидация параметров запроса
    const queryResult = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return createErrorResponse('Неверные параметры запроса', 400);
    }

    const {
      columnId, boardId, projectId, assigneeId, reporterId, status, priority,
      page, limit, search, sortBy, sortOrder, includeArchived,
      dueDateFrom, dueDateTo, tags
    } = queryResult.data;

    // Построение фильтров
    const filters: any = {};
    
    if (columnId) {
      filters.columnId = columnId;
      // Проверка доступа к колонке через доску и проект
      const column = await databaseAdapter.getColumnById(columnId);
      if (!column) {
        return createErrorResponse('Колонка не найдена', 404);
      }
      const board = await databaseAdapter.getBoardById(column.board_id);
      if (!board) {
        return createErrorResponse('Доска не найдена', 404);
      }
      const hasAccess = await databaseAdapter.hasProjectAccess(user.id, board.project_id.toString());
      if (!hasAccess) {
        return createErrorResponse('Нет доступа к проекту', 403);
      }
    } else if (boardId) {
      filters.boardId = boardId;
      // Проверка доступа к доске
      const board = await databaseAdapter.getBoardById(boardId);
      if (!board) {
        return createErrorResponse('Доска не найдена', 404);
      }
      const hasAccess = await databaseAdapter.hasProjectAccess(user.id, board.project_id.toString());
      if (!hasAccess) {
        return createErrorResponse('Нет доступа к проекту', 403);
      }
    } else if (projectId) {
      filters.projectId = projectId;
      // Проверка доступа к проекту
      const hasAccess = await databaseAdapter.hasProjectAccess(user.id, projectId.toString());
      if (!hasAccess) {
        return createErrorResponse('Нет доступа к проекту', 403);
      }
    }

    if (assigneeId) filters.assigneeId = assigneeId;
    if (reporterId) filters.reporterId = reporterId;
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (!includeArchived) filters.archived = false;

    // Получение задач
    let tasks;
    if (columnId) {
      tasks = await databaseAdapter.getTasks({ columnId });
    } else if (boardId) {
      tasks = await databaseAdapter.getTasks({ boardId });
    } else if (projectId) {
      tasks = await databaseAdapter.getTasks({ projectId });
    } else {
      // Получаем все задачи пользователя
      tasks = await databaseAdapter.getTasks({ assigneeId: user.id });
    }

    // Фильтрация по поиску
    if (search) {
      const searchLower = search.toLowerCase();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
      );
    }

    // Фильтрация по статусу
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }

    // Фильтрация по приоритету
    if (priority) {
      tasks = tasks.filter(task => task.priority === priority);
    }

    // Фильтрация по исполнителю
    if (assigneeId) {
      tasks = tasks.filter(task => task.assignee_id === assigneeId);
    }

    // Фильтрация по создателю
    if (reporterId) {
      tasks = tasks.filter(task => task.reporter_id === reporterId);
    }

    // Фильтрация по датам
    if (dueDateFrom) {
      tasks = tasks.filter(task => task.due_date && new Date(task.due_date) >= new Date(dueDateFrom));
    }
    if (dueDateTo) {
      tasks = tasks.filter(task => task.due_date && new Date(task.due_date) <= new Date(dueDateTo));
    }

    // Фильтрация по тегам
    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim().toLowerCase());
      tasks = tasks.filter(task => {
        if (!task.tags) return false;
        const taskTags = Array.isArray(task.tags) ? task.tags : JSON.parse(task.tags || '[]');
        return tagList.some(tag => taskTags.some((taskTag: string) => taskTag.toLowerCase().includes(tag)));
      });
    }

    // Сортировка
    tasks.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'title') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortBy === 'priority') {
        const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
        aValue = priorityOrder[aValue] || 0;
        bValue = priorityOrder[bValue] || 0;
      }
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // Пагинация
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    // Обогащение данных задач
    const enrichedTasks = await Promise.all(
      paginatedTasks.map(async (task) => {
        // Получаем информацию об исполнителе
        let assignee = null;
        if (task.assignee_id) {
          assignee = await databaseAdapter.getUserById(task.assignee_id);
          if (assignee) {
            assignee = {
              id: assignee.id,
              username: assignee.username,
              email: assignee.email,
              avatar: assignee.avatar
            };
          }
        }

        // Получаем информацию о создателе
        let reporter = null;
        if (task.reporter_id) {
          reporter = await databaseAdapter.getUserById(task.reporter_id);
          if (reporter) {
            reporter = {
              id: reporter.id,
              username: reporter.username,
              email: reporter.email,
              avatar: reporter.avatar
            };
          }
        }

        // Получаем информацию о колонке
        const column = await databaseAdapter.getColumnById(task.column_id);

        return {
          ...task,
          assignee,
          reporter,
          column: column ? {
            id: column.id,
            name: column.name,
            color: column.color
          } : null,
          tags: Array.isArray(task.tags) ? task.tags : JSON.parse(task.tags || '[]'),
          attachments: Array.isArray(task.attachments) ? task.attachments : JSON.parse(task.attachments || '[]'),
          customFields: task.custom_fields ? JSON.parse(task.custom_fields) : {}
        };
      })
    );

    return createPaginationResponse(
      enrichedTasks,
      page,
      limit,
      tasks.length,
      'Задачи успешно получены'
    );

  } catch (error) {
    console.error('Ошибка получения задач:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST /api/v2/tasks - Создание новой задачи
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const body = await request.json();

    // Валидация данных
    const validationResult = createTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const taskData = validationResult.data;

    // Проверка существования колонки
    const column = await databaseAdapter.getColumnById(taskData.columnId);
    if (!column) {
      return createErrorResponse('Колонка не найдена', 404);
    }

    // Получение информации о доске
    const board = await databaseAdapter.getBoardById(column.board_id);
    if (!board) {
      return createErrorResponse('Доска не найдена', 404);
    }

    // Проверка доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(user.id, board.project_id.toString());
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к проекту', 403);
    }

    // Проверка исполнителя (если указан)
    if (taskData.assigneeId) {
      const assignee = await databaseAdapter.getUserById(taskData.assigneeId);
      if (!assignee) {
        return createErrorResponse('Указанный исполнитель не найден', 404);
      }
      
      // Проверка доступа исполнителя к проекту
      const assigneeHasAccess = await databaseAdapter.hasProjectAccess(taskData.assigneeId, board.project_id.toString());
      if (!assigneeHasAccess) {
        return createErrorResponse('Исполнитель не имеет доступа к проекту', 403);
      }
    }

    // Определение позиции для новой задачи
    let position = taskData.position;
    if (position === undefined) {
      const existingTasks = await databaseAdapter.getTasks({ columnId: taskData.columnId });
      position = existingTasks.length;
    }

    // Создание задачи
    const task = await databaseAdapter.createTask({
      title: taskData.title,
      description: taskData.description || null,
      status: taskData.status,
      priority: taskData.priority,
      column_id: taskData.columnId,
      board_id: board.id,
      project_id: board.project_id,
      assignee_id: taskData.assigneeId || null,
      reporter_id: user.id,
      position,
      due_date: taskData.dueDate || null,
      estimated_hours: taskData.estimatedHours || null,
      actual_hours: taskData.actualHours || null,
      tags: JSON.stringify(taskData.tags),
      attachments: JSON.stringify(taskData.attachments),
      custom_fields: taskData.customFields ? JSON.stringify(taskData.customFields) : null
    });

    if (!task) {
      return createErrorResponse('Не удалось создать задачу', 500);
    }

    // Получение обогащенной информации о задаче
    let assignee = null;
    if (task.assignee_id) {
      assignee = await databaseAdapter.getUserById(task.assignee_id);
      if (assignee) {
        assignee = {
          id: assignee.id,
          username: assignee.username,
          email: assignee.email,
          avatar: assignee.avatar
        };
      }
    }

    const reporter = await databaseAdapter.getUserById(task.reporter_id);
    const enrichedTask = {
      ...task,
      assignee,
      reporter: reporter ? {
        id: reporter.id,
        username: reporter.username,
        email: reporter.email,
        avatar: reporter.avatar
      } : null,
      column: {
        id: column.id,
        name: column.name,
        color: column.color
      },
      tags: JSON.parse(task.tags || '[]'),
      attachments: JSON.parse(task.attachments || '[]'),
      customFields: task.custom_fields ? JSON.parse(task.custom_fields) : {}
    };

    return createSuccessResponse(enrichedTask, 'Задача успешно создана');

  } catch (error) {
    console.error('Ошибка создания задачи:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// PUT /api/v2/tasks - Обновление задачи
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return createErrorResponse('ID задачи обязателен', 400);
    }

    // Проверка доступа к задаче
    const hasAccess = await checkTaskAccess(user.id, parseInt(taskId));
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к задаче', 403);
    }

    const body = await request.json();

    // Валидация данных
    const validationResult = updateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const updateData = validationResult.data;

    // Проверка исполнителя (если изменяется)
    if (updateData.assigneeId !== undefined) {
      if (updateData.assigneeId !== null) {
        const assignee = await databaseAdapter.getUserById(updateData.assigneeId);
        if (!assignee) {
          return createErrorResponse('Указанный исполнитель не найден', 404);
        }
        
        // Получаем информацию о проекте задачи
        const task = await databaseAdapter.getTaskById(parseInt(taskId));
        if (task) {
          const column = await databaseAdapter.getColumnById(task.column_id);
          if (column) {
            const board = await databaseAdapter.getBoardById(column.board_id);
            if (board) {
              const assigneeHasAccess = await databaseAdapter.hasProjectAccess(updateData.assigneeId, board.project_id.toString());
              if (!assigneeHasAccess) {
                return createErrorResponse('Исполнитель не имеет доступа к проекту', 403);
              }
            }
          }
        }
      }
    }

    // Обновление задачи
    const updatedTask = await databaseAdapter.updateTask(parseInt(taskId), {
      ...updateData,
      tags: updateData.tags ? JSON.stringify(updateData.tags) : undefined,
      attachments: updateData.attachments ? JSON.stringify(updateData.attachments) : undefined,
      custom_fields: updateData.customFields ? JSON.stringify(updateData.customFields) : undefined
    });

    if (!updatedTask) {
      return createErrorResponse('Не удалось обновить задачу', 500);
    }

    return createSuccessResponse(updatedTask, 'Задача успешно обновлена');

  } catch (error) {
    console.error('Ошибка обновления задачи:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE /api/v2/tasks - Удаление задачи
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return createErrorResponse('ID задачи обязателен', 400);
    }

    // Проверка доступа к задаче
    const hasAccess = await checkTaskAccess(user.id, parseInt(taskId));
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к задаче', 403);
    }

    // Дополнительная проверка: только создатель задачи или админ может удалить
    const task = await databaseAdapter.getTaskById(parseInt(taskId));
    if (!task) {
      return createErrorResponse('Задача не найдена', 404);
    }

    if (user.role !== 'admin' && task.reporter_id !== user.id) {
      return createErrorResponse('Нет прав на удаление задачи', 403);
    }

    // Удаление задачи
    const success = await databaseAdapter.deleteTask(parseInt(taskId));
    if (!success) {
      return createErrorResponse('Не удалось удалить задачу', 500);
    }

    return createSuccessResponse(null, 'Задача успешно удалена');

  } catch (error) {
    console.error('Ошибка удаления задачи:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// PATCH /api/v2/tasks/move - Перемещение задачи
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    const action = searchParams.get('action');

    if (!taskId) {
      return createErrorResponse('ID задачи обязателен', 400);
    }

    if (action === 'move') {
      // Проверка доступа к задаче
      const hasAccess = await checkTaskAccess(user.id, parseInt(taskId));
      if (!hasAccess) {
        return createErrorResponse('Нет доступа к задаче', 403);
      }

      const body = await request.json();

      // Валидация данных для перемещения
      const validationResult = moveTaskSchema.safeParse(body);
      if (!validationResult.success) {
        return createErrorResponse(
          `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }

      const { columnId, position } = validationResult.data;

      // Проверка существования целевой колонки
      const targetColumn = await databaseAdapter.getColumnById(columnId);
      if (!targetColumn) {
        return createErrorResponse('Целевая колонка не найдена', 404);
      }

      // Проверка доступа к целевой колонке
      const targetBoard = await databaseAdapter.getBoardById(targetColumn.board_id);
      if (!targetBoard) {
        return createErrorResponse('Целевая доска не найдена', 404);
      }

      const hasTargetAccess = await databaseAdapter.hasProjectAccess(user.id, targetBoard.project_id.toString());
      if (!hasTargetAccess) {
        return createErrorResponse('Нет доступа к целевому проекту', 403);
      }

      // Перемещение задачи
      const updatedTask = await databaseAdapter.updateTask(parseInt(taskId), {
        column_id: columnId,
        position: position
      });

      if (!updatedTask) {
        return createErrorResponse('Не удалось переместить задачу', 500);
      }

      return createSuccessResponse(updatedTask, 'Задача успешно перемещена');
    }

    return createErrorResponse('Неизвестное действие', 400);

  } catch (error) {
    console.error('Ошибка операции с задачей:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}