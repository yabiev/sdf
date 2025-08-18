import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';
import { databaseAdapter } from '@/lib/database-adapter-optimized';

// Схемы валидации
const createColumnSchema = z.object({
  name: z.string().min(1, 'Название колонки обязательно').max(255, 'Название слишком длинное'),
  boardId: z.number().min(1, 'ID доски обязателен'),
  position: z.number().min(0).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
  taskLimit: z.number().min(0).optional(),
  settings: z.object({
    allowTaskCreation: z.boolean().default(true),
    autoMoveCompletedTasks: z.boolean().default(false),
    taskLimit: z.number().min(0).optional(),
    sortBy: z.enum(['position', 'priority', 'created_at', 'due_date']).default('position'),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  }).optional()
});

const updateColumnSchema = createColumnSchema.partial().omit({ boardId: true });

const querySchema = z.object({
  boardId: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'position', 'created_at', 'updated_at']).default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeTaskCount: z.coerce.boolean().default(true)
});

const reorderColumnsSchema = z.object({
  columns: z.array(z.object({
    id: z.number(),
    position: z.number().min(0)
  })).min(1, 'Необходимо указать хотя бы одну колонку')
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

// Утилита для проверки доступа к доске
async function checkBoardAccess(userId: number, boardId: number): Promise<boolean> {
  try {
    const board = await databaseAdapter.getBoardById(boardId);
    if (!board) return false;
    
    return await databaseAdapter.hasProjectAccess(userId, board.project_id.toString());
  } catch (error) {
    console.error('Ошибка проверки доступа к доске:', error);
    return false;
  }
}

// GET /api/v2/columns - Получение списка колонок
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

    const { boardId, page, limit, search, sortBy, sortOrder, includeTaskCount } = queryResult.data;

    // Проверка обязательного параметра boardId
    if (!boardId) {
      return createErrorResponse('ID доски обязателен', 400);
    }

    // Проверка доступа к доске
    const hasAccess = await checkBoardAccess(user.id, boardId);
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к доске', 403);
    }

    // Получение колонок доски
    let columns = await databaseAdapter.getBoardColumns(boardId);

    // Фильтрация по поиску
    if (search) {
      const searchLower = search.toLowerCase();
      columns = columns.filter(column => 
        column.name.toLowerCase().includes(searchLower)
      );
    }

    // Сортировка
    columns.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'name') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
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
    const paginatedColumns = columns.slice(startIndex, endIndex);

    // Добавление информации о задачах для каждой колонки
    const columnsWithTasks = await Promise.all(
      paginatedColumns.map(async (column) => {
        let taskCount = 0;
        let tasks = [];
        
        if (includeTaskCount) {
          const columnTasks = await databaseAdapter.getTasks({ columnId: column.id });
          taskCount = columnTasks.length;
          
          // Добавляем краткую информацию о задачах
          tasks = columnTasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            position: task.position,
            assignee_id: task.assignee_id
          }));
        }
        
        return {
          ...column,
          taskCount,
          tasks: includeTaskCount ? tasks : undefined
        };
      })
    );

    return createPaginationResponse(
      columnsWithTasks,
      page,
      limit,
      columns.length,
      'Колонки успешно получены'
    );

  } catch (error) {
    console.error('Ошибка получения колонок:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST /api/v2/columns - Создание новой колонки
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const body = await request.json();

    // Валидация данных
    const validationResult = createColumnSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const columnData = validationResult.data;

    // Проверка доступа к доске
    const hasAccess = await checkBoardAccess(user.id, columnData.boardId);
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к доске', 403);
    }

    // Проверка существования доски
    const board = await databaseAdapter.getBoardById(columnData.boardId);
    if (!board) {
      return createErrorResponse('Доска не найдена', 404);
    }

    // Определение позиции для новой колонки
    let position = columnData.position;
    if (position === undefined) {
      const existingColumns = await databaseAdapter.getBoardColumns(columnData.boardId);
      position = existingColumns.length;
    }

    // Создание колонки
    const column = await databaseAdapter.createColumn({
      name: columnData.name,
      board_id: columnData.boardId,
      position,
      color: columnData.color || '#6B7280',
      created_by: user.id,
      task_limit: columnData.taskLimit || null,
      settings: columnData.settings ? JSON.stringify(columnData.settings) : JSON.stringify({
        allowTaskCreation: true,
        autoMoveCompletedTasks: false,
        sortBy: 'position',
        sortOrder: 'asc'
      })
    });

    if (!column) {
      return createErrorResponse('Не удалось создать колонку', 500);
    }

    // Добавляем информацию о создателе
    const creator = await databaseAdapter.getUserById(user.id);
    const enrichedColumn = {
      ...column,
      creator: creator ? {
        id: creator.id,
        username: creator.username,
        email: creator.email
      } : null,
      taskCount: 0,
      tasks: []
    };

    return createSuccessResponse(enrichedColumn, 'Колонка успешно создана');

  } catch (error) {
    console.error('Ошибка создания колонки:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// PUT /api/v2/columns - Обновление колонки
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const columnId = searchParams.get('id');

    if (!columnId) {
      return createErrorResponse('ID колонки обязателен', 400);
    }

    // Проверка существования колонки
    const existingColumn = await databaseAdapter.getColumnById(parseInt(columnId));
    if (!existingColumn) {
      return createErrorResponse('Колонка не найдена', 404);
    }

    // Проверка доступа к доске
    const hasAccess = await checkBoardAccess(user.id, existingColumn.board_id);
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к доске', 403);
    }

    const body = await request.json();

    // Валидация данных
    const validationResult = updateColumnSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const updateData = validationResult.data;

    // Обновление колонки
    const updatedColumn = await databaseAdapter.updateColumn(parseInt(columnId), {
      ...updateData,
      settings: updateData.settings ? JSON.stringify(updateData.settings) : undefined
    });

    if (!updatedColumn) {
      return createErrorResponse('Не удалось обновить колонку', 500);
    }

    return createSuccessResponse(updatedColumn, 'Колонка успешно обновлена');

  } catch (error) {
    console.error('Ошибка обновления колонки:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE /api/v2/columns - Удаление колонки
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const columnId = searchParams.get('id');
    const moveTasksToColumnId = searchParams.get('moveTasksTo');

    if (!columnId) {
      return createErrorResponse('ID колонки обязателен', 400);
    }

    // Проверка существования колонки
    const existingColumn = await databaseAdapter.getColumnById(parseInt(columnId));
    if (!existingColumn) {
      return createErrorResponse('Колонка не найдена', 404);
    }

    // Проверка доступа к доске
    const hasAccess = await checkBoardAccess(user.id, existingColumn.board_id);
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к доске', 403);
    }

    // Проверка наличия задач в колонке
    const tasks = await databaseAdapter.getTasks({ columnId: parseInt(columnId) });
    
    if (tasks.length > 0) {
      if (!moveTasksToColumnId) {
        return createErrorResponse(
          'В колонке есть задачи. Укажите ID колонки для перемещения задач или удалите их сначала',
          400
        );
      }

      // Проверка существования целевой колонки
      const targetColumn = await databaseAdapter.getColumnById(parseInt(moveTasksToColumnId));
      if (!targetColumn) {
        return createErrorResponse('Целевая колонка для перемещения задач не найдена', 404);
      }

      // Проверка, что целевая колонка принадлежит той же доске
      if (targetColumn.board_id !== existingColumn.board_id) {
        return createErrorResponse('Целевая колонка должна принадлежать той же доске', 400);
      }

      // Перемещение всех задач в целевую колонку
      for (const task of tasks) {
        await databaseAdapter.updateTask(task.id, {
          column_id: parseInt(moveTasksToColumnId)
        });
      }
    }

    // Удаление колонки
    const success = await databaseAdapter.deleteColumn(parseInt(columnId));
    if (!success) {
      return createErrorResponse('Не удалось удалить колонку', 500);
    }

    return createSuccessResponse(
      null, 
      tasks.length > 0 
        ? `Колонка удалена, ${tasks.length} задач(и) перемещено в другую колонку`
        : 'Колонка успешно удалена'
    );

  } catch (error) {
    console.error('Ошибка удаления колонки:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// PATCH /api/v2/columns/reorder - Изменение порядка колонок
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reorder') {
      const body = await request.json();

      // Валидация данных
      const validationResult = reorderColumnsSchema.safeParse(body);
      if (!validationResult.success) {
        return createErrorResponse(
          `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
          400
        );
      }

      const { columns } = validationResult.data;

      // Проверка доступа к первой колонке (предполагаем, что все колонки из одной доски)
      const firstColumn = await databaseAdapter.getColumnById(columns[0].id);
      if (!firstColumn) {
        return createErrorResponse('Колонка не найдена', 404);
      }

      const hasAccess = await checkBoardAccess(user.id, firstColumn.board_id);
      if (!hasAccess) {
        return createErrorResponse('Нет доступа к доске', 403);
      }

      // Проверка, что все колонки принадлежат одной доске
      for (const columnData of columns) {
        const column = await databaseAdapter.getColumnById(columnData.id);
        if (!column || column.board_id !== firstColumn.board_id) {
          return createErrorResponse('Все колонки должны принадлежать одной доске', 400);
        }
      }

      // Обновление позиций колонок
      const updatedColumns = [];
      for (const columnData of columns) {
        const updatedColumn = await databaseAdapter.updateColumn(columnData.id, {
          position: columnData.position
        });
        if (updatedColumn) {
          updatedColumns.push(updatedColumn);
        }
      }

      return createSuccessResponse(
        updatedColumns,
        'Порядок колонок успешно изменен'
      );
    }

    return createErrorResponse('Неизвестное действие', 400);

  } catch (error) {
    console.error('Ошибка изменения порядка колонок:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}