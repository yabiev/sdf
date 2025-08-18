import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';
import { databaseAdapter } from '@/lib/database-adapter-optimized';

// Схемы валидации
const createProjectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно').max(255, 'Название слишком длинное'),
  description: z.string().optional(),
  visibility: z.enum(['private', 'public']).default('private'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
  settings: z.object({
    allowGuestAccess: z.boolean().default(false),
    enableNotifications: z.boolean().default(true),
    defaultBoardVisibility: z.enum(['private', 'public']).default('private'),
    autoArchiveInactiveTasks: z.boolean().default(false),
    taskNumberingEnabled: z.boolean().default(true)
  }).optional(),
  telegramChatId: z.string().optional(),
  telegramTopicId: z.string().optional()
});

const updateProjectSchema = createProjectSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  visibility: z.enum(['private', 'public']).optional(),
  sortBy: z.enum(['name', 'created_at', 'updated_at']).default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
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

// GET /api/v2/projects - Получение списка проектов
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

    const { page, limit, search, visibility, sortBy, sortOrder, includeArchived } = queryResult.data;

    // Получение проектов с учетом роли пользователя
    let projects;
    let total;

    if (user.role === 'admin') {
      // Администраторы видят все проекты
      projects = await databaseAdapter.getAllProjects();
      total = projects.length;
    } else {
      // Обычные пользователи видят только свои проекты
      projects = await databaseAdapter.getUserProjects(user.id);
      total = projects.length;
    }

    // Фильтрация по поиску
    if (search) {
      const searchLower = search.toLowerCase();
      projects = projects.filter(project => 
        project.name.toLowerCase().includes(searchLower) ||
        (project.description && project.description.toLowerCase().includes(searchLower))
      );
    }

    // Фильтрация по видимости
    if (visibility) {
      projects = projects.filter(project => project.visibility === visibility);
    }

    // Фильтрация архивных проектов
    if (!includeArchived) {
      projects = projects.filter(project => !project.archived);
    }

    // Сортировка
    projects.sort((a, b) => {
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
    const paginatedProjects = projects.slice(startIndex, endIndex);

    return createPaginationResponse(
      paginatedProjects,
      page,
      limit,
      projects.length,
      'Проекты успешно получены'
    );

  } catch (error) {
    console.error('Ошибка получения проектов:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST /api/v2/projects - Создание нового проекта
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const body = await request.json();

    // Валидация данных
    const validationResult = createProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const projectData = validationResult.data;

    // Создание проекта
    const project = await databaseAdapter.createProject({
      name: projectData.name,
      description: projectData.description || null,
      creator_id: user.id,
      visibility: projectData.visibility,
      color: projectData.color || '#3B82F6',
      settings: JSON.stringify(projectData.settings || {
        allowGuestAccess: false,
        enableNotifications: true,
        defaultBoardVisibility: 'private',
        autoArchiveInactiveTasks: false,
        taskNumberingEnabled: true
      }),
      telegram_chat_id: projectData.telegramChatId || null,
      telegram_topic_id: projectData.telegramTopicId || null
    });

    if (!project) {
      return createErrorResponse('Не удалось создать проект', 500);
    }

    // Создание доски по умолчанию
    const defaultBoard = await databaseAdapter.createBoard({
      name: 'Основная доска',
      description: 'Доска по умолчанию для проекта',
      project_id: project.id,
      creator_id: user.id,
      visibility: projectData.settings?.defaultBoardVisibility || 'private',
      color: projectData.color || '#3B82F6',
      settings: JSON.stringify({
        allowTaskCreation: true,
        allowColumnReordering: true,
        enableTaskLimits: false,
        defaultTaskPriority: 'medium',
        autoArchiveCompletedTasks: false
      })
    });

    if (defaultBoard) {
      // Создание колонок по умолчанию
      const defaultColumns = [
        { name: 'К выполнению', position: 0, color: '#EF4444' },
        { name: 'В работе', position: 1, color: '#F59E0B' },
        { name: 'На проверке', position: 2, color: '#3B82F6' },
        { name: 'Выполнено', position: 3, color: '#10B981' }
      ];

      for (const columnData of defaultColumns) {
        await databaseAdapter.createColumn({
          name: columnData.name,
          board_id: defaultBoard.id,
          position: columnData.position,
          color: columnData.color,
          created_by: user.id
        });
      }
    }

    return createSuccessResponse(
      { ...project, defaultBoard },
      'Проект успешно создан'
    );

  } catch (error) {
    console.error('Ошибка создания проекта:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// PUT /api/v2/projects - Обновление проекта
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return createErrorResponse('ID проекта обязателен', 400);
    }

    // Проверка существования проекта
    const existingProject = await databaseAdapter.getProjectById(projectId);
    if (!existingProject) {
      return createErrorResponse('Проект не найден', 404);
    }

    // Проверка прав доступа
    if (user.role !== 'admin' && existingProject.creator_id !== user.id) {
      return createErrorResponse('Нет прав на редактирование проекта', 403);
    }

    const body = await request.json();

    // Валидация данных
    const validationResult = updateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const updateData = validationResult.data;

    // Обновление проекта
    const updatedProject = await databaseAdapter.updateProject(projectId, {
      ...updateData,
      settings: updateData.settings ? JSON.stringify(updateData.settings) : undefined
    });

    if (!updatedProject) {
      return createErrorResponse('Не удалось обновить проект', 500);
    }

    return createSuccessResponse(updatedProject, 'Проект успешно обновлен');

  } catch (error) {
    console.error('Ошибка обновления проекта:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE /api/v2/projects - Удаление проекта
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return createErrorResponse('ID проекта обязателен', 400);
    }

    // Проверка существования проекта
    const existingProject = await databaseAdapter.getProjectById(projectId);
    if (!existingProject) {
      return createErrorResponse('Проект не найден', 404);
    }

    // Проверка прав доступа (только админы и создатели могут удалять)
    if (user.role !== 'admin' && existingProject.creator_id !== user.id) {
      return createErrorResponse('Нет прав на удаление проекта', 403);
    }

    // Удаление проекта
    const success = await databaseAdapter.deleteProject(projectId);
    if (!success) {
      return createErrorResponse('Не удалось удалить проект', 500);
    }

    return createSuccessResponse(null, 'Проект успешно удален');

  } catch (error) {
    console.error('Ошибка удаления проекта:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}