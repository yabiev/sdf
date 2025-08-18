import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { z } from 'zod';
import { ColumnService } from '@/services/implementations/column.service';
import { ColumnRepository } from '@/services/implementations/column.repository';
import { ColumnValidator } from '@/services/implementations/column.validator';
import { dbAdapter } from '@/lib/database-adapter';

const createColumnSchema = z.object({
  title: z.string().min(1, 'Column title is required'),
  boardId: z.string().min(1, 'Board ID is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  wipLimit: z.number().min(1).optional().nullable(),
  isCollapsed: z.boolean().optional()
});

// Инициализация сервисов
const columnRepository = new ColumnRepository(dbAdapter);
const columnValidator = new ColumnValidator();
const columnService = new ColumnService(
  columnRepository,
  columnValidator,
  null, // wip service
  null, // automation service
  null, // factory
  null  // event service
);

// Получение списка колонок
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
    }

    // Проверка доступа к доске через проект
    const board = await databaseAdapter.getBoardById(Number(boardId));
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    const hasAccess = await databaseAdapter.hasProjectAccess(Number(user.id), Number(board.project_id));
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Используем новый сервис для получения колонок
    const result = await columnService.getByBoardId(boardId, {
      includeArchived: searchParams.get('includeArchived') === 'true',
      sortBy: (searchParams.get('sortBy') as any) || 'position',
      sortOrder: (searchParams.get('sortOrder') as any) || 'asc'
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ columns: result.data });
  } catch (error) {
    console.error('Error fetching columns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Создание новой колонки
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createColumnSchema.parse(body);

    // Проверка доступа к доске через проект
    const board = await databaseAdapter.getBoardById(Number(validatedData.boardId));
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    const hasAccess = await databaseAdapter.hasProjectAccess(Number(user.id), Number(board.project_id));
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Используем новый сервис для создания колонки
    const result = await columnService.create({
      title: validatedData.title,
      boardId: validatedData.boardId,
      color: validatedData.color || '#6366f1',
      wipLimit: validatedData.wipLimit,
      isCollapsed: validatedData.isCollapsed || false,
      settings: {
        autoMoveRules: [],
        notifications: {
          onTaskAdded: false,
          onTaskMoved: false,
          onWipLimitExceeded: true
        },
        taskTemplate: {
          defaultPriority: 'medium',
          defaultTags: []
        }
      }
    }, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ column: result.data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating column:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Обновление позиций колонок (для drag & drop)
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { columns, boardId } = await request.json();

    if (!Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: 'Columns array is required' },
        { status: 400 }
      );
    }

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      );
    }

    // Проверка доступа к доске
    const board = await databaseAdapter.getBoardById(Number(boardId));
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    const hasAccess = await databaseAdapter.hasProjectAccess(Number(user.id), Number(board.project_id));
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Преобразуем данные в нужный формат
    const columnOrders = columns.map((col: any, index: number) => ({
      id: col.id,
      position: index
    }));

    // Используем новый сервис для изменения порядка колонок
    const result = await columnService.reorder(boardId, columnOrders, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Column positions updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating column positions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}