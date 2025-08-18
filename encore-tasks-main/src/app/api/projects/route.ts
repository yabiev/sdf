import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import databaseAdapter from '@/lib/database-adapter-optimized';

// Получение списка проектов
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { userId, role } = authResult.user!;

    let projects;
    if (role === 'admin') {
      // Админы видят все проекты
      projects = await databaseAdapter.getAllProjects();
    } else {
      // Обычные пользователи видят только свои проекты
      projects = await databaseAdapter.getProjectsByUserId(Number(userId));
    }

    // Преобразование в формат API с правильной типизацией
    const projectsResult = projects.map(project => ({
      id: project.id, // Оставляем ID как строку для совместимости с API удаления
      name: project.name,
      description: project.description || null,
      status: project.status || 'active',
      color: project.color || '#3B82F6',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      userId: Number(project.createdBy) // Используем createdBy из схемы БД
    }));

    return NextResponse.json({ projects: projectsResult });
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Создание нового проекта
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { userId } = authResult.user!;
    const { name, description, color, icon } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Название проекта обязательно' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }

    const projectData = {
      name,
      description: description || null,
      createdBy: userId, // userId уже является UUID строкой
      color: color || '#3B82F6'
    };
    const project = await databaseAdapter.createProject(projectData);
    
    // Проверяем, что проект был создан успешно
    if (!project || !project.id) {
      console.error('Failed to create project - no project ID returned');
      return NextResponse.json(
        { error: 'Ошибка создания проекта' },
        { status: 500 }
      );
    }

    // Создаем доску по умолчанию для нового проекта
    const board = await databaseAdapter.createBoard(
      `Доска проекта ${name}`,
      '', // description не используется в схеме
      project.id
    );
    
    console.log('Created board:', board);
    console.log('Board ID:', board.id, 'Type:', typeof board.id);

    // Создаем колонки по умолчанию
    const defaultColumns = [
      { name: 'К выполнению', color: '#ef4444', position: 0 },
      { name: 'В работе', color: '#f59e0b', position: 1 },
      { name: 'На проверке', color: '#3b82f6', position: 2 },
      { name: 'Выполнено', color: '#10b981', position: 3 }
    ];

    for (const column of defaultColumns) {
      await databaseAdapter.createColumn(
        column.name,
        board.id,
        column.position,
        column.color
      );
    }

    // Преобразование в формат API с правильной типизацией
    const projectResult = {
      id: project.id,
      name: project.name,
      description: project.description || null,
      status: project.status || 'active',
      color: project.color || '#3B82F6',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      userId: project.createdBy
    };

    return NextResponse.json(
      { project: projectResult },
      { status: 201 }
    );

  } catch (error) {
    console.error('Ошибка создания проекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Удаление проекта (только для администраторов)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;
    
    // Проверка прав администратора
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления проекта' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'ID проекта обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования проекта
    const project = await databaseAdapter.getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Удаление проекта
    await databaseAdapter.deleteProject(projectId);

    return NextResponse.json(
      { message: 'Проект успешно удален' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Ошибка удаления проекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}