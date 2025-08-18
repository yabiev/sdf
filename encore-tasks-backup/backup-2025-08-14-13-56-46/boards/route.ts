import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';
import { BoardService } from '@/services/implementations/board.service';
import { BoardRepository } from '@/services/implementations/board.repository';
import { BoardValidator } from '@/services/implementations/board.validator';
import { dbAdapter } from '@/lib/database-adapter';

const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Project ID is required'),
  visibility: z.enum(['private', 'public']).default('private'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
});

// Инициализация сервисов
const boardRepository = new BoardRepository(dbAdapter);
const boardValidator = new BoardValidator();
const boardService = new BoardService(
  boardRepository,
  boardValidator,
  null, // permission service
  null  // event service
);

// Получение списка досок
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { userId } = authResult.user!;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'ID проекта обязателен' },
        { status: 400 }
      );
    }
    
    // Проверка доступа к проекту
    const hasAccess = await dbAdapter.hasProjectAccess(Number(userId), Number(projectId));
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Нет доступа к проекту' },
        { status: 403 }
      );
    }

    // Используем новый сервис для получения досок
    const result = await boardService.getBoardsByProject(projectId, userId, {
      includeArchived: searchParams.get('includeArchived') === 'true',
      sortBy: (searchParams.get('sortBy') as any) || 'position',
      sortOrder: (searchParams.get('sortOrder') as any) || 'asc'
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ boards: result.data });
  } catch (error) {
    console.error('Ошибка получения досок:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Создание новой доски
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
    const body = await request.json();
    const validatedData = createBoardSchema.parse(body);

    // Проверяем доступ к проекту
    const hasAccess = await dbAdapter.hasProjectAccess(Number(userId), validatedData.projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Используем новый сервис для создания доски
    const result = await boardService.createBoard({
      name: validatedData.name,
      description: validatedData.description || null,
      projectId: validatedData.projectId,
      visibility: validatedData.visibility,
      color: validatedData.color || '#3B82F6',
      settings: {
        allowTaskCreation: true,
        allowColumnReordering: true,
        enableTaskLimits: false,
        defaultTaskPriority: 'medium',
        autoArchiveCompletedTasks: false
      }
    }, Number(userId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ board: result.data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating board:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Удаление доски (только для администраторов)
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
        { error: 'Недостаточно прав для удаления доски' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json(
        { error: 'ID доски обязателен' },
        { status: 400 }
      );
    }

    // Используем новый сервис для удаления доски
    const result = await boardService.delete(boardId, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Доска успешно удалена' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Ошибка удаления доски:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}