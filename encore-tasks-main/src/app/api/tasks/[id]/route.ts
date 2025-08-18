import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { dbAdapter } from '@/lib/database-adapter';
import { TaskPermissionService } from '@/services/implementations/task-permission.service';

// Получение задачи по ID
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

    const { userId } = authResult.user;
    const { id } = await params;
    const taskId = id;

    const task = await dbAdapter.getTaskById(Number(taskId));
    
    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    // Проверяем права доступа к задаче
    const taskPermissionService = new TaskPermissionService(dbAdapter);
    const canView = await taskPermissionService.canUserViewTask(Number(taskId), userId, authResult.user.role);
    
    if (!canView) {
      return NextResponse.json(
        { error: 'Нет доступа к задаче' },
        { status: 403 }
      );
    }
    
    // Преобразование в формат API с правильной типизацией
    // Преобразуем статус из формата БД в формат фронтенда
    const frontendStatus = task.status === 'in_progress' ? 'in-progress' : task.status;
    
    const enrichedTask = {
      id: Number(task.id),
      title: task.title,
      description: task.description || null,
      status: frontendStatus || 'todo',
      priority: task.priority || 'medium',
      position: task.position || 0,
      storyPoints: 0, // TODO: Добавить в интерфейс Task
      estimatedHours: 0, // TODO: Добавить в интерфейс Task
      actualHours: 0, // TODO: Добавить в интерфейс Task
      deadline: task.deadline,
      startedAt: null, // TODO: Добавить в интерфейс Task
      completedAt: task.completedAt,
      isArchived: false, // TODO: Добавить в интерфейс Task
      archivedAt: null, // TODO: Добавить в интерфейс Task
      projectId: task.projectId ? Number(task.projectId) : null,
      projectName: 'Project Name', // TODO: Получить из проекта
      projectColor: '#6366f1',
      boardId: task.boardId ? Number(task.boardId) : null,
      boardName: 'Board Name', // TODO: Получить из доски
      columnId: task.columnId ? Number(task.columnId) : null,
      columnTitle: 'Column Title', // TODO: Получить из колонки
      columnColor: '#6366f1',
      reporterId: task.reporterId ? Number(task.reporterId) : null,
      reporterName: 'Reporter Name', // TODO: Получить из пользователя
      parentTaskId: null, // TODO: Добавить в интерфейс Task
      parentTaskTitle: null,
      assignees: [], // TODO: Реализовать получение исполнителей
      tags: [], // TODO: Реализовать получение тегов
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };

    return NextResponse.json({ task: enrichedTask });

  } catch (error) {
    console.error('Ошибка получения задачи:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Обновление задачи
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

    const { userId } = authResult.user;
    const { id } = await params;
    const taskId = id;
    const updateData = await request.json();
    
    // Проверка существования задачи
    const existingTask = await dbAdapter.getTaskById(Number(taskId));
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }
    
    // Проверяем права доступа к задаче
    const taskPermissionService = new TaskPermissionService(dbAdapter);
    const canEdit = await taskPermissionService.canUserEditTask(Number(taskId), userId, authResult.user.role);
    
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Нет прав на редактирование задачи' },
        { status: 403 }
      );
    }

    // Подготовка данных для обновления
    const updateTaskData: Partial<typeof existingTask> = {
      ...existingTask,
      updatedAt: new Date()
    };

    // Обновление разрешенных полей
    const allowedFields = ['title', 'description', 'status', 'priority', 'position', 'columnId', 'deadline'];
    
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        if (field === 'deadline' && updateData[field]) {
          updateTaskData[field] = new Date(updateData[field]);
        } else if (field === 'status') {
          // Преобразуем статус из формата фронтенда в формат БД
          updateTaskData[field] = updateData[field] === 'in-progress' ? 'in_progress' : updateData[field];
        } else {
          updateTaskData[field] = updateData[field];
        }
      }
    }

    // Обновление времени завершения при изменении статуса
    if (updateData.status === 'done' && existingTask.status !== 'done') {
      updateTaskData.completedAt = new Date();
    } else if (updateData.status !== 'done' && existingTask.status === 'done') {
      updateTaskData.completedAt = undefined;
    }

    // Обновление задачи
    const updatedTask = await dbAdapter.updateTask(Number(taskId), {
      title: updateTaskData.title,
      description: updateTaskData.description || null,
      status: updateTaskData.status || 'todo',
      priority: updateTaskData.priority || 'medium',
      position: updateTaskData.position || 0,
      columnId: updateTaskData.columnId ? Number(updateTaskData.columnId) : undefined,
      deadline: updateTaskData.deadline,
      completedAt: updateTaskData.completedAt
    });
    
    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Ошибка обновления задачи' },
        { status: 500 }
      );
    }
    
    // TODO: Обновление исполнителей и тегов
    // if (updateData.assigneeIds !== undefined) {
    //   await db.updateTaskAssignees(taskId, updateData.assigneeIds);
    // }
    // if (updateData.tags !== undefined) {
    //   await db.updateTaskTags(taskId, updateData.tags);
    // }
    
    // Преобразование в формат API с правильной типизацией
    // Преобразуем статус из формата БД в формат фронтенда
    const frontendStatusUpdated = updatedTask.status === 'in_progress' ? 'in-progress' : updatedTask.status;
    
    const enrichedTask = {
      id: Number(updatedTask.id),
      title: updatedTask.title,
      description: updatedTask.description || null,
      status: frontendStatusUpdated || 'todo',
      priority: updatedTask.priority || 'medium',
      position: updatedTask.position || 0,
      storyPoints: 0, // TODO: Добавить в интерфейс Task
      estimatedHours: 0, // TODO: Добавить в интерфейс Task
      actualHours: 0, // TODO: Добавить в интерфейс Task
      deadline: updatedTask.deadline,
      startedAt: null, // TODO: Добавить в интерфейс Task
      completedAt: updatedTask.completedAt,
      isArchived: false, // TODO: Добавить в интерфейс Task
      archivedAt: null, // TODO: Добавить в интерфейс Task
      projectId: updatedTask.projectId ? Number(updatedTask.projectId) : null,
      projectName: 'Project Name', // TODO: Получить из проекта
      projectColor: '#6366f1',
      boardId: updatedTask.boardId ? Number(updatedTask.boardId) : null,
      boardName: 'Board Name', // TODO: Получить из доски
      columnId: updatedTask.columnId ? Number(updatedTask.columnId) : null,
      columnTitle: 'Column Title', // TODO: Получить из колонки
      columnColor: '#6366f1',
      reporterId: updatedTask.reporterId ? Number(updatedTask.reporterId) : null,
      reporterName: 'Reporter Name', // TODO: Получить из пользователя
      parentTaskId: null, // TODO: Добавить в интерфейс Task
      parentTaskTitle: null,
      assignees: [], // TODO: Реализовать получение исполнителей
      tags: [], // TODO: Реализовать получение тегов
      createdAt: updatedTask.createdAt,
      updatedAt: updatedTask.updatedAt
    };

    return NextResponse.json({ task: enrichedTask });

  } catch (error) {
    console.error('Ошибка обновления задачи:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Удаление задачи
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

    const { userId } = authResult.user;
    const { id } = await params;
    const taskId = id;

    // Проверка существования задачи
    const existingTask = await dbAdapter.getTaskById(Number(taskId));
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }
    
    // Проверяем права доступа к задаче
    const taskPermissionService = new TaskPermissionService(dbAdapter);
    const canDelete = await taskPermissionService.canUserDeleteTask(Number(taskId), userId, authResult.user.role);
    
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Нет прав на удаление задачи. Вы можете удалять только созданные вами задачи.' },
        { status: 403 }
      );
    }

    // Удаление задачи
    const success = await dbAdapter.deleteTask(Number(taskId));
    
    if (!success) {
      return NextResponse.json(
        { error: 'Ошибка удаления задачи' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Задача успешно удалена' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Ошибка удаления задачи:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}