import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';
import { databaseAdapter } from '@/lib/database-adapter-optimized';

// Схемы валидации
const createBoardSchema = z.object({
  name: z.string().min(1, 'Название доски обязательно').max(255, 'Название слишком длинное'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'ID проекта обязателен'),
  visibility: z.enum(['private', 'public']).default('private'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
  position: z.number().min(0).optional(),
  settings: z.object({
    allowTaskCreation: z.boolean().default(true),
    allowColumnReordering: z.boolean().default(true),
    enableTaskLimits: z.boolean().default(false),
    defaultTaskPriority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    autoArchiveCompletedTasks: z.boolean().default(false),
    maxTasksPerColumn: z.number().min(1).optional(),
    enableTimeTracking: z.boolean().default(false)
  }).optional()
});

const updateBoardSchema = createBoardSchema.partial().omit({ projectId: true });

const querySchema = z.object({
  projectId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  visibility: z.enum(['private', 'public']).optional(),
  sortBy: z.enum(['name', 'position', 'created_at', 'updated_at']).default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeArchived: z.coerce.boolean().default(false)
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

// GET /api/v2/boards - Получение списка досок
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

    const { projectId, page, limit, search, visibility, sortBy, sortOrder, includeArchived } = queryResult.data;

    // Проверка обязательного параметра projectId
    if (!projectId) {
      return createErrorResponse('ID проекта обязателен', 400);
    }

    // Проверка доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к проекту', 403);
    }

    // Получение досок проекта
    let boards = await databaseAdapter.getProjectBoards(projectId);

    // Фильтрация по поиску
    if (search) {
      const searchLower = search.toLowerCase();
      boards = boards.filter(board => 
        board.name.toLowerCase().includes(searchLower) ||
        (board.description && board.description.toLowerCase().includes(searchLower))
      );
    }

    // Фильтрация по видимости
    if (visibility) {
      boards = boards.filter(board => board.visibility === visibility);
    }

    // Фильтрация архивных досок
    if (!includeArchived) {
      boards = boards.filter(board => !board.archived);
    }

    // Сортировка
    boards.sort((a, b) => {
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
    const paginatedBoards = boards.slice(startIndex, endIndex);

    // Добавление информации о колонках для каждой доски
    const boardsWithColumns = await Promise.all(
      paginatedBoards.map(async (board) => {
        const columns = await databaseAdapter.getBoardColumns(board.id);
        return {
          ...board,
          columnsCount: columns.length,
          columns: columns.map(col => ({
            id: col.id,
            name: col.name,
            position: col.position,
            color: col.color
          }))
        };
      })
    );

    return createPaginationResponse(
      boardsWithColumns,
      page,
      limit,
      boards.length,
      'Доски успешно получены'
    );

  } catch (error) {
    console.error('Ошибка получения досок:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST /api/v2/boards - Создание новой доски
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const body = await request.json();

    // Валидация данных
    const validationResult = createBoardSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const boardData = validationResult.data;

    // Проверка доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(user.id, boardData.projectId);
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к проекту', 403);
    }

    // Проверка существования проекта
    const project = await databaseAdapter.getProjectById(boardData.projectId);
    if (!project) {
      return createErrorResponse('Проект не найден', 404);
    }

    // Определение позиции для новой доски
    let position = boardData.position;
    if (position === undefined) {
      const existingBoards = await databaseAdapter.getProjectBoards(boardData.projectId);
      position = existingBoards.length;
    }

    // Создание доски
    const board = await databaseAdapter.createBoard({
      name: boardData.name,
      description: boardData.description || null,
      project_id: parseInt(boardData.projectId),
      creator_id: user.id,
      visibility: boardData.visibility,
      color: boardData.color || '#3B82F6',
      position,
      settings: JSON.stringify(boardData.settings || {
        allowTaskCreation: true,
        allowColumnReordering: true,
        enableTaskLimits: false,
        defaultTaskPriority: 'medium',
        autoArchiveCompletedTasks: false,
        enableTimeTracking: false
      })
    });

    if (!board) {
      return createErrorResponse('Не удалось создать доску', 500);
    }

    // Создание колонок по умолчанию
    const defaultColumns = [
      { name: 'К выполнению', position: 0, color: '#EF4444' },
      { name: 'В работе', position: 1, color: '#F59E0B' },
      { name: 'На проверке', position: 2, color: '#3B82F6' },
      { name: 'Выполнено', position: 3, color: '#10B981' }
    ];

    const createdColumns = [];
    for (const columnData of defaultColumns) {
      const column = await databaseAdapter.createColumn({
        name: columnData.name,
        board_id: board.id,
        position: columnData.position,
        color: columnData.color,
        created_by: user.id
      });
      if (column) {
        createdColumns.push(column);
      }
    }

    return createSuccessResponse(
      { ...board, columns: createdColumns },
      'Доска успешно создана'
    );

  } catch (error) {
    console.error('Ошибка создания доски:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// PUT /api/v2/boards - Обновление доски
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('id');

    if (!boardId) {
      return createErrorResponse('ID доски обязателен', 400);
    }

    // Проверка существования доски
    const existingBoard = await databaseAdapter.getBoardById(parseInt(boardId));
    if (!existingBoard) {
      return createErrorResponse('Доска не найдена', 404);
    }

    // Проверка прав доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(user.id, existingBoard.project_id.toString());
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к проекту', 403);
    }

    const body = await request.json();

    // Валидация данных
    const validationResult = updateBoardSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const updateData = validationResult.data;

    // Обновление доски
    const updatedBoard = await databaseAdapter.updateBoard(parseInt(boardId), {
      ...updateData,
      settings: updateData.settings ? JSON.stringify(updateData.settings) : undefined
    });

    if (!updatedBoard) {
      return createErrorResponse('Не удалось обновить доску', 500);
    }

    return createSuccessResponse(updatedBoard, 'Доска успешно обновлена');

  } catch (error) {
    console.error('Ошибка обновления доски:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE /api/v2/boards - Удаление доски
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('id');

    if (!boardId) {
      return createErrorResponse('ID доски обязателен', 400);
    }

    // Проверка существования доски
    const existingBoard = await databaseAdapter.getBoardById(parseInt(boardId));
    if (!existingBoard) {
      return createErrorResponse('Доска не найдена', 404);
    }

    // Проверка прав доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(user.id, existingBoard.project_id.toString());
    if (!hasAccess) {
      return createErrorResponse('Нет доступа к проекту', 403);
    }

    // Дополнительная проверка: только создатель доски или админ может удалить
    if (user.role !== 'admin' && existingBoard.creator_id !== user.id) {
      return createErrorResponse('Нет прав на удаление доски', 403);
    }

    // Удаление доски
    const success = await databaseAdapter.deleteBoard(parseInt(boardId));
    if (!success) {
      return createErrorResponse('Не удалось удалить доску', 500);
    }

    return createSuccessResponse(null, 'Доска успешно удалена');

  } catch (error) {
    console.error('Ошибка удаления доски:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}