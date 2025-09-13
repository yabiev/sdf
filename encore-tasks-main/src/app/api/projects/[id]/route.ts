import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DatabaseAdapter } from '@/lib/database-adapter';

const databaseAdapter = DatabaseAdapter.getInstance();
import { verifyAuth } from '@/lib/auth';
import { UpdateProjectDto, ProjectWithStats } from '@/types/core.types';

// Схема валидации для обновления проекта
const updateProjectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно').max(100, 'Название слишком длинное').optional(),
  description: z.string().max(500, 'Описание слишком длинное').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Неверный формат цвета').optional(),
  icon: z.string().min(1, 'Иконка обязательна').optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
  visibility: z.enum(['private', 'public']).optional(),
  telegram_chat_id: z.string().optional(),
  telegram_topic_id: z.string().optional(),
  settings: z.record(z.string(), z.any()).optional()
});

// Упрощенная проверка доступа к проекту для SQLite
async function checkProjectAccess(projectId: string, userId: string, requiredRole?: string) {
  try {
    const project = await databaseAdapter.getProjectById(projectId);
    if (!project) {
      return { hasAccess: false, role: null };
    }
    
    // Для SQLite упрощаем - владелец проекта имеет полный доступ
    const isOwner = project.created_by === userId;
    return { hasAccess: isOwner, role: isOwner ? 'owner' : null, isOwner };
  } catch (error) {
    return { hasAccess: false, role: null };
  }
}

// GET /api/projects/[id] - Получить проект по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    await databaseAdapter.initialize();

    // Проверяем доступ к проекту
    const accessCheck = await checkProjectAccess(projectId, authResult.user.userId);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Получаем информацию о проекте
    const project = await databaseAdapter.getProjectById(projectId);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Для SQLite упрощаем статистику
    const projectWithStats: ProjectWithStats = {
      ...project,
      icon: project.icon_url || 'folder',
      status: 'active',
      visibility: 'private',
      settings: {},
      created_by_username: 'admin', // Упрощено для SQLite
      members_count: 1,
      boards_count: 0,
      tasks_count: 0
    };

    // Для SQLite упрощаем - только владелец проекта
    const members = [{
      id: '1',
      project_id: projectId,
      user_id: authResult.user.userId,
      role: 'owner',
      permissions: {},
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: authResult.user.userId,
        username: authResult.user.name,
        first_name: '',
        last_name: '',
        email: authResult.user.email,
        avatar_url: null
      }
    }];

    return NextResponse.json({
      success: true,
      data: {
        project: projectWithStats,
        members,
        user_role: accessCheck.role
      }
    });

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Обновить проект
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    await databaseAdapter.initialize();

    // Проверяем доступ к проекту (требуется роль admin или выше)
    const accessCheck = await checkProjectAccess(projectId, authResult.user.userId, 'admin');
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Admin role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateProjectSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const updateData: UpdateProjectDto = validationResult.data;

    // Для SQLite пока не реализуем обновление проектов
    return NextResponse.json({
      success: false,
      error: 'Project update not implemented for SQLite'
    }, { status: 501 });

  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Удалить проект
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    await databaseAdapter.initialize();

    // Проверяем доступ к проекту (требуется роль owner или admin системы)
    const accessCheck = await checkProjectAccess(projectId, authResult.user.userId);
    if (!accessCheck.hasAccess || (!accessCheck.isOwner && authResult.user.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Owner or admin role required' },
        { status: 403 }
      );
    }

    // Удаляем проект через SQLite адаптер
    const deleted = await databaseAdapter.deleteProject(projectId);
    
    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'Project not found or could not be deleted'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}