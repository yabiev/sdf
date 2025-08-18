import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';
import { databaseAdapter } from '@/lib/database-adapter-optimized';
import bcrypt from 'bcryptjs';

// Схемы валидации
const createUserSchema = z.object({
  username: z.string().min(3, 'Имя пользователя должно содержать минимум 3 символа').max(50, 'Имя пользователя слишком длинное'),
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  firstName: z.string().min(1, 'Имя обязательно').max(100, 'Имя слишком длинное').optional(),
  lastName: z.string().min(1, 'Фамилия обязательна').max(100, 'Фамилия слишком длинная').optional(),
  role: z.enum(['admin', 'user']).default('user'),
  telegramId: z.string().optional(),
  telegramUsername: z.string().optional(),
  avatar: z.string().url('Неверный формат URL аватара').optional(),
  settings: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.enum(['ru', 'en']).default('ru'),
    notifications: z.object({
      email: z.boolean().default(true),
      telegram: z.boolean().default(false),
      push: z.boolean().default(true)
    }).default({}),
    timezone: z.string().default('Europe/Moscow')
  }).optional()
});

const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'Новый пароль должен содержать минимум 6 символов').optional()
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
  sortBy: z.enum(['username', 'email', 'created_at', 'updated_at', 'firstName', 'lastName']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeStats: z.coerce.boolean().default(false)
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

// Утилита для очистки пользовательских данных (убираем пароль)
function sanitizeUser(user: any) {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
}

// Утилита для получения статистики пользователя
async function getUserStats(userId: number) {
  try {
    const [projects, tasks, boards] = await Promise.all([
      databaseAdapter.getProjects({ creatorId: userId }),
      databaseAdapter.getTasks({ assigneeId: userId }),
      databaseAdapter.getBoards({ creatorId: userId })
    ]);

    const completedTasks = tasks.filter(task => task.status === 'completed');
    const activeTasks = tasks.filter(task => task.status !== 'completed' && task.status !== 'archived');

    return {
      projectsCount: projects.length,
      boardsCount: boards.length,
      tasksCount: tasks.length,
      completedTasksCount: completedTasks.length,
      activeTasksCount: activeTasks.length,
      completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0
    };
  } catch (error) {
    console.error('Ошибка получения статистики пользователя:', error);
    return null;
  }
}

// GET /api/v2/users - Получение списка пользователей
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

    const { page, limit, search, role, sortBy, sortOrder, includeStats } = queryResult.data;

    // Проверка прав доступа (только админы могут просматривать всех пользователей)
    if (user.role !== 'admin') {
      return createErrorResponse('Недостаточно прав доступа', 403);
    }

    // Получение всех пользователей
    let users = await databaseAdapter.getAllUsers();

    // Фильтрация по поиску
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchLower))
      );
    }

    // Фильтрация по роли
    if (role) {
      users = users.filter(user => user.role === role);
    }

    // Сортировка
    users.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (typeof aValue === 'string') {
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
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Очистка данных и добавление статистики
    const sanitizedUsers = await Promise.all(
      paginatedUsers.map(async (user) => {
        const sanitized = sanitizeUser(user);
        
        if (includeStats) {
          const stats = await getUserStats(user.id);
          return { ...sanitized, stats };
        }
        
        return sanitized;
      })
    );

    return createPaginationResponse(
      sanitizedUsers,
      page,
      limit,
      users.length,
      'Пользователи успешно получены'
    );

  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// POST /api/v2/users - Создание нового пользователя
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    
    // Проверка прав доступа (только админы могут создавать пользователей)
    if (user.role !== 'admin') {
      return createErrorResponse('Недостаточно прав доступа', 403);
    }

    const body = await request.json();

    // Валидация данных
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const userData = validationResult.data;

    // Проверка уникальности username и email
    const existingUser = await databaseAdapter.getUserByUsernameOrEmail(userData.username, userData.email);
    if (existingUser) {
      if (existingUser.username === userData.username) {
        return createErrorResponse('Пользователь с таким именем уже существует', 409);
      }
      if (existingUser.email === userData.email) {
        return createErrorResponse('Пользователь с таким email уже существует', 409);
      }
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Создание пользователя
    const newUser = await databaseAdapter.createUser({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      first_name: userData.firstName || null,
      last_name: userData.lastName || null,
      role: userData.role,
      telegram_id: userData.telegramId || null,
      telegram_username: userData.telegramUsername || null,
      avatar: userData.avatar || null,
      settings: userData.settings ? JSON.stringify(userData.settings) : JSON.stringify({
        theme: 'system',
        language: 'ru',
        notifications: {
          email: true,
          telegram: false,
          push: true
        },
        timezone: 'Europe/Moscow'
      })
    });

    if (!newUser) {
      return createErrorResponse('Не удалось создать пользователя', 500);
    }

    const sanitizedUser = sanitizeUser(newUser);
    return createSuccessResponse(sanitizedUser, 'Пользователь успешно создан');

  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// PUT /api/v2/users - Обновление пользователя
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return createErrorResponse('ID пользователя обязателен', 400);
    }

    const targetUserId = parseInt(userId);

    // Проверка прав доступа (админы могут редактировать всех, пользователи только себя)
    if (user.role !== 'admin' && user.id !== targetUserId) {
      return createErrorResponse('Недостаточно прав доступа', 403);
    }

    // Проверка существования пользователя
    const existingUser = await databaseAdapter.getUserById(targetUserId);
    if (!existingUser) {
      return createErrorResponse('Пользователь не найден', 404);
    }

    const body = await request.json();

    // Валидация данных
    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        `Ошибка валидации: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        400
      );
    }

    const updateData = validationResult.data;

    // Проверка уникальности username и email (если они изменяются)
    if (updateData.username || updateData.email) {
      const conflictUser = await databaseAdapter.getUserByUsernameOrEmail(
        updateData.username || existingUser.username,
        updateData.email || existingUser.email
      );
      
      if (conflictUser && conflictUser.id !== targetUserId) {
        if (conflictUser.username === updateData.username) {
          return createErrorResponse('Пользователь с таким именем уже существует', 409);
        }
        if (conflictUser.email === updateData.email) {
          return createErrorResponse('Пользователь с таким email уже существует', 409);
        }
      }
    }

    // Проверка смены пароля
    let hashedNewPassword;
    if (updateData.newPassword) {
      if (!updateData.currentPassword) {
        return createErrorResponse('Для смены пароля необходимо указать текущий пароль', 400);
      }

      const isCurrentPasswordValid = await bcrypt.compare(updateData.currentPassword, existingUser.password);
      if (!isCurrentPasswordValid) {
        return createErrorResponse('Неверный текущий пароль', 400);
      }

      hashedNewPassword = await bcrypt.hash(updateData.newPassword, 12);
    }

    // Проверка прав на изменение роли (только админы)
    if (updateData.role && user.role !== 'admin') {
      return createErrorResponse('Недостаточно прав для изменения роли', 403);
    }

    // Подготовка данных для обновления
    const updatePayload: any = {};
    
    if (updateData.username) updatePayload.username = updateData.username;
    if (updateData.email) updatePayload.email = updateData.email;
    if (updateData.firstName !== undefined) updatePayload.first_name = updateData.firstName;
    if (updateData.lastName !== undefined) updatePayload.last_name = updateData.lastName;
    if (updateData.role) updatePayload.role = updateData.role;
    if (updateData.telegramId !== undefined) updatePayload.telegram_id = updateData.telegramId;
    if (updateData.telegramUsername !== undefined) updatePayload.telegram_username = updateData.telegramUsername;
    if (updateData.avatar !== undefined) updatePayload.avatar = updateData.avatar;
    if (hashedNewPassword) updatePayload.password = hashedNewPassword;
    
    if (updateData.settings) {
      updatePayload.settings = JSON.stringify(updateData.settings);
    }

    // Обновление пользователя
    const updatedUser = await databaseAdapter.updateUser(targetUserId, updatePayload);
    if (!updatedUser) {
      return createErrorResponse('Не удалось обновить пользователя', 500);
    }

    const sanitizedUser = sanitizeUser(updatedUser);
    return createSuccessResponse(sanitizedUser, 'Пользователь успешно обновлен');

  } catch (error) {
    console.error('Ошибка обновления пользователя:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}

// DELETE /api/v2/users - Удаление пользователя
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createErrorResponse(authResult.error || 'Не авторизован', 401);
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const transferProjectsTo = searchParams.get('transferProjectsTo');

    if (!userId) {
      return createErrorResponse('ID пользователя обязателен', 400);
    }

    const targetUserId = parseInt(userId);

    // Проверка прав доступа (только админы могут удалять пользователей)
    if (user.role !== 'admin') {
      return createErrorResponse('Недостаточно прав доступа', 403);
    }

    // Нельзя удалить самого себя
    if (user.id === targetUserId) {
      return createErrorResponse('Нельзя удалить самого себя', 400);
    }

    // Проверка существования пользователя
    const existingUser = await databaseAdapter.getUserById(targetUserId);
    if (!existingUser) {
      return createErrorResponse('Пользователь не найден', 404);
    }

    // Проверка наличия проектов у пользователя
    const userProjects = await databaseAdapter.getProjects({ creatorId: targetUserId });
    
    if (userProjects.length > 0) {
      if (!transferProjectsTo) {
        return createErrorResponse(
          `У пользователя есть ${userProjects.length} проект(ов). Укажите ID пользователя для передачи проектов`,
          400
        );
      }

      // Проверка существования пользователя для передачи проектов
      const transferUser = await databaseAdapter.getUserById(parseInt(transferProjectsTo));
      if (!transferUser) {
        return createErrorResponse('Пользователь для передачи проектов не найден', 404);
      }

      // Передача всех проектов другому пользователю
      for (const project of userProjects) {
        await databaseAdapter.updateProject(project.id, {
          creator_id: parseInt(transferProjectsTo)
        });
      }
    }

    // Удаление пользователя из всех проектов как участника
    await databaseAdapter.removeUserFromAllProjects(targetUserId);

    // Обновление задач (снятие назначения)
    const userTasks = await databaseAdapter.getTasks({ assigneeId: targetUserId });
    for (const task of userTasks) {
      await databaseAdapter.updateTask(task.id, {
        assignee_id: null
      });
    }

    // Удаление пользователя
    const success = await databaseAdapter.deleteUser(targetUserId);
    if (!success) {
      return createErrorResponse('Не удалось удалить пользователя', 500);
    }

    return createSuccessResponse(
      null,
      userProjects.length > 0
        ? `Пользователь удален, ${userProjects.length} проект(ов) передано другому пользователю`
        : 'Пользователь успешно удален'
    );

  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    return createErrorResponse('Внутренняя ошибка сервера', 500);
  }
}