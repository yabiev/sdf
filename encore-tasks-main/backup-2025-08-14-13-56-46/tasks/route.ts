import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { dbAdapter } from '@/lib/database-adapter';
import { createHash } from 'crypto';
import { z } from 'zod';
import { TaskService } from '@/services/implementations/task.service';
import { TaskRepository } from '@/services/implementations/task.repository';
import { TaskValidator } from '@/services/implementations/task.validator';

// Инициализация сервисов
const taskRepository = new TaskRepository();
const taskValidator = new TaskValidator();
const taskService = new TaskService(taskRepository, taskValidator);

// Схема для создания задачи
const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.number().optional(),
  columnId: z.number(),
  position: z.number().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  tags: z.array(z.string()).optional()
});

// Получение задач
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const columnId = searchParams.get('columnId');
    const projectId = searchParams.get('projectId');
    const boardId = searchParams.get('boardId');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');
    const priority = searchParams.get('priority');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const sortBy = searchParams.get('sortBy') || 'position';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Создаем объект фильтров
    const filters: any = {};
    
    if (columnId) {
      filters.columnId = Number(columnId);
    }
    if (boardId && !isNaN(Number(boardId))) {
      filters.boardId = Number(boardId);
    }
    if (projectId) {
      // Проверка доступа к проекту
      const hasAccess = await dbAdapter.hasProjectAccess(Number(user.id), Number(projectId));
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      filters.projectId = Number(projectId);
    }
    if (status) {
      filters.status = status;
    }
    if (assigneeId) {
      filters.assigneeId = Number(assigneeId);
    }
    if (priority) {
      filters.priority = priority;
    }
    
    let result;
    
    if (columnId) {
      result = await taskService.getByColumnId(Number(columnId), {
        includeArchived,
        sortBy,
        sortOrder,
        page,
        limit
      });
    } else if (boardId) {
      result = await taskService.getByBoardId(Number(boardId), {
        includeArchived,
        sortBy,
        sortOrder,
        page,
        limit,
        status,
        priority,
        assigneeId: assigneeId ? Number(assigneeId) : undefined
      });
    } else if (projectId) {
      result = await taskService.getByProjectId(Number(projectId), {
        includeArchived,
        sortBy,
        sortOrder,
        page,
        limit,
        status,
        priority,
        assigneeId: assigneeId ? Number(assigneeId) : undefined
      });
    } else if (assigneeId) {
      result = await taskService.getByAssigneeId(Number(assigneeId), {
        includeArchived,
        sortBy,
        sortOrder,
        page,
        limit,
        status,
        priority
      });
    } else {
      result = await taskService.getAll({
        includeArchived,
        sortBy,
        sortOrder,
        page,
        limit,
        status,
        priority,
        assigneeId: assigneeId ? Number(assigneeId) : undefined
      });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const responseData = {
      tasks: result.data,
      total: result.data.length
    };

    // Generate ETag based on tasks data
    const etag = createHash('md5')
      .update(JSON.stringify(responseData))
      .digest('hex');

    // Check if client has cached version
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === etag) {
      return new NextResponse(null, { status: 304 });
    }

    const response = NextResponse.json(responseData);
    
    // Set caching headers
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'private, max-age=60, must-revalidate'); // 1 minute
    response.headers.set('Vary', 'Authorization, Cookie');
    
    return response;

  } catch (error) {
    console.error('Ошибка получения задач:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Создание новой задачи
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Валидация данных с помощью Zod
    const validationResult = createTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { title, description, status, priority, assigneeId, columnId, position, dueDate, estimatedHours, tags } = validationResult.data;

    // Получаем информацию о колонке для определения project_id и board_id
    const column = await dbAdapter.getColumnById(Number(columnId));
    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }
    
    const board = await dbAdapter.getBoardById(Number(column.board_id));
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    
    if (!board.projectId) {
      return NextResponse.json({ error: 'Board is not linked to a project' }, { status: 400 });
    }
    
    // Проверяем доступ к проекту
    const hasAccess = await dbAdapter.hasProjectAccess(Number(user.id), Number(board.projectId));
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Создаем задачу через новый сервис
    const result = await taskService.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      columnId: Number(columnId),
      boardId: Number(board.id),
      projectId: Number(board.projectId),
      assigneeId,
      reporterId: Number(user.id),
      position,
      dueDate,
      estimatedHours,
      tags: tags || []
    }, Number(user.id));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ task: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}