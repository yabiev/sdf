import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import databaseAdapter from '@/lib/database-adapter-optimized';

// Получение проекта по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { userId, role } = authResult.user;
    const { id } = await params;
    const projectId = id;

    // Валидация ID проекта
    if (!projectId || projectId === 'null' || projectId === 'undefined' || projectId.trim() === '') {
      return NextResponse.json(
        { error: 'Некорректный ID проекта' },
        { status: 400 }
      );
    }

    // Проверка доступа к проекту
    const hasAccess = await databaseAdapter.hasProjectAccess(userId, projectId);
    if (!hasAccess && role !== 'admin') {
      return NextResponse.json(
        { error: 'Нет доступа к проекту' },
        { status: 403 }
      );
    }

    const project = await databaseAdapter.getProjectById(projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Преобразование в формат API
    const projectResult = {
      id: Number(project.id),
      name: project.name,
      description: project.description || null,
      status: project.status || 'active',
      color: project.color || '#3B82F6',
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      userId: Number(project.user_id)
    };

    return NextResponse.json({ project: projectResult });

  } catch (error) {
    console.error('Ошибка получения проекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Обновление проекта
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { userId, role } = authResult.user;
    const { id } = await params;
    const projectId = id;
    const updateData = await request.json();
    
    // Валидация ID проекта
    if (!projectId || projectId === 'null' || projectId === 'undefined') {
      return NextResponse.json(
        { error: 'Некорректный ID проекта' },
        { status: 400 }
      );
    }
    
    // Проверка существования проекта
    const existingProject = await databaseAdapter.getProjectById(projectId);
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }
    
    // Проверка прав на изменение проекта
    const isOwner = Number(existingProject.user_id) === Number(userId);
    if (!isOwner && role !== 'admin') {
      return NextResponse.json(
        { error: 'Нет прав на изменение проекта' },
        { status: 403 }
      );
    }

    // Подготовка данных для обновления
    const allowedFields = ['name', 'description', 'color', 'status'];
    const updateProjectData: any = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateProjectData[field] = updateData[field];
      }
    }

    if (Object.keys(updateProjectData).length === 0) {
      return NextResponse.json(
        { error: 'Нет данных для обновления' },
        { status: 400 }
      );
    }

    // Обновление проекта
    const success = await databaseAdapter.updateProject(projectId, updateProjectData);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Ошибка обновления проекта' },
        { status: 500 }
      );
    }

    // Получение обновленного проекта
    const updatedProject = await databaseAdapter.getProjectById(projectId);
    
    const projectResult = {
      id: Number(updatedProject!.id),
      name: updatedProject!.name,
      description: updatedProject!.description || null,
      status: updatedProject!.status || 'active',
      color: updatedProject!.color || '#3B82F6',
      createdAt: updatedProject!.created_at,
      updatedAt: updatedProject!.updated_at,
      userId: Number(updatedProject!.user_id)
    };

    return NextResponse.json({ project: projectResult });

  } catch (error) {
    console.error('Ошибка обновления проекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Удаление проекта
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { userId, role } = authResult.user;
    const { id } = await params;
    const projectId = id;
    
    // Валидация ID проекта
    if (!projectId || projectId === 'null' || projectId === 'undefined') {
      return NextResponse.json(
        { error: 'Некорректный ID проекта' },
        { status: 400 }
      );
    }
    
    // Проверка существования проекта
    const existingProject = await databaseAdapter.getProjectById(projectId);
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }
    
    // Проверка прав на удаление проекта
    const isOwner = Number(existingProject.user_id) === Number(userId);
    if (!isOwner && role !== 'admin') {
      return NextResponse.json(
        { error: 'Нет прав на удаление проекта' },
        { status: 403 }
      );
    }

    // Удаление проекта
    const success = await databaseAdapter.deleteProject(projectId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Ошибка удаления проекта' },
        { status: 500 }
      );
    }

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