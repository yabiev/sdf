import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, requireAdmin } from '@/lib/auth';
import databaseAdapter from '@/lib/database-adapter-optimized';
import bcrypt from 'bcryptjs';

// Получение списка пользователей
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.user!.userId;
    const role = authResult.user!.role;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    const includeStats = searchParams.get('includeStats') === 'true';

    const allUsers = await databaseAdapter.getUsers();
    
    // Фильтрация пользователей в зависимости от роли
    let filteredUsers = allUsers;
    if (role !== 'admin') {
      filteredUsers = allUsers.filter(user => user.status === 'active');
    }
    
    // Фильтрация по статусу
    if (status && role === 'admin') {
      filteredUsers = filteredUsers.filter(user => user.status === status);
    }
    
    // Фильтрация по проекту (если указан)
    if (projectId) {
      // Для упрощения пока не реализуем фильтрацию по проекту
      // В реальном приложении здесь нужно получить участников проекта
    }
    
    // Преобразование в формат API с правильной типизацией
    const users = filteredUsers.map(user => {
      const userResult = {
        id: String(user.id), // Оставляем ID как строку для совместимости
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.is_active ? 'active' : 'inactive',
        avatar: user.avatar_url || null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_login_at
      };

      if (includeStats) {
        userResult.stats = {
          assignedTasksCount: 0,
          createdTasksCount: 0,
          createdProjectsCount: 0
        };
      }

      return userResult;
    });

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Создание нового пользователя (только для администраторов)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // Проверка прав администратора
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const {
      name,
      email,
      password,
      role = 'user',
      status = 'active'
    } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Имя, email и пароль обязательны' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    // Проверка уникальности email
    const existingUser = await databaseAdapter.getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      );
    }

    // Создание пользователя (пароль будет хеширован в createUser)
    const user = await databaseAdapter.createUser(email.toLowerCase(), password, name, role);

    const createdUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.is_active ? 'active' : 'inactive',
      avatar: user.avatar || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    return NextResponse.json(
      { user: createdUser },
      { status: 201 }
    );

  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}