import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Схема валидации для создания задачи
const createTaskSchema = z.object({
  title: z.string().min(1, 'Название задачи обязательно').max(200),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  assigneeIds: z.array(z.number().int()).optional().default([]),
  labelIds: z.array(z.number().int()).optional().default([]),
  position: z.number().int().min(0).optional(),
});

// Схема валидации для обновления позиций задач
const updatePositionsSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.number().int(),
      position: z.number().int().min(0),
      columnId: z.number().int().optional(), // Для перемещения между колонками
    })
  ),
});

// GET /api/columns/[id]/tasks - получить задачи колонки
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка аутентификации
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Необходима аутентификация' },
        { status: 401 }
      );
    }

    const columnId = parseInt(params.id);
    if (isNaN(columnId)) {
      return NextResponse.json(
        { error: 'Неверный ID колонки' },
        { status: 400 }
      );
    }

    // Проверка доступа к колонке
    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: {
          project: {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!column) {
      return NextResponse.json(
        { error: 'Колонка не найдена или доступ запрещен' },
        { status: 404 }
      );
    }

    // Получение задач колонки
    const tasks = await prisma.task.findMany({
      where: {
        columnId,
      },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        labels: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        column: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/columns/[id]/tasks - создать новую задачу в колонке
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка аутентификации
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Необходима аутентификация' },
        { status: 401 }
      );
    }

    const columnId = parseInt(params.id);
    if (isNaN(columnId)) {
      return NextResponse.json(
        { error: 'Неверный ID колонки' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    // Проверка прав на создание задач
    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: {
          project: {
            members: {
              some: {
                userId: session.user.id,
                role: {
                  in: ['OWNER', 'ADMIN', 'MEMBER'],
                },
              },
            },
          },
        },
      },
      include: {
        board: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!column) {
      return NextResponse.json(
        { error: 'Недостаточно прав для создания задачи' },
        { status: 403 }
      );
    }

    // Проверка существования назначенных пользователей
    if (validatedData.assigneeIds.length > 0) {
      const validAssignees = await prisma.projectMember.findMany({
        where: {
          projectId: column.board.projectId,
          userId: {
            in: validatedData.assigneeIds,
          },
        },
      });

      if (validAssignees.length !== validatedData.assigneeIds.length) {
        return NextResponse.json(
          { error: 'Некоторые назначенные пользователи не являются участниками проекта' },
          { status: 400 }
        );
      }
    }

    // Определение позиции для новой задачи
    let position = validatedData.position;
    if (position === undefined) {
      const lastTask = await prisma.task.findFirst({
        where: { columnId },
        orderBy: { position: 'desc' },
      });
      position = (lastTask?.position ?? -1) + 1;
    }

    // Создание задачи в транзакции
    const task = await prisma.$transaction(async (tx) => {
      // Создание задачи
      const newTask = await tx.task.create({
        data: {
          title: validatedData.title,
          description: validatedData.description || '',
          priority: validatedData.priority,
          dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
          position,
          columnId,
          createdById: session.user.id,
          projectId: column.board.projectId,
        },
      });

      // Назначение пользователей
      if (validatedData.assigneeIds.length > 0) {
        await tx.taskAssignee.createMany({
          data: validatedData.assigneeIds.map((userId) => ({
            taskId: newTask.id,
            userId,
          })),
        });
      }

      // Назначение меток
      if (validatedData.labelIds.length > 0) {
        await tx.taskLabel.createMany({
          data: validatedData.labelIds.map((labelId) => ({
            taskId: newTask.id,
            labelId,
          })),
        });
      }

      // Получение созданной задачи с связанными данными
      return await tx.task.findUnique({
        where: { id: newTask.id },
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          labels: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          column: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Ошибка при создании задачи:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Неверные данные',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH /api/columns/[id]/tasks - обновить позиции задач
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверка аутентификации
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Необходима аутентификация' },
        { status: 401 }
      );
    }

    const columnId = parseInt(params.id);
    if (isNaN(columnId)) {
      return NextResponse.json(
        { error: 'Неверный ID колонки' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updatePositionsSchema.parse(body);

    // Проверка прав на изменение задач
    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: {
          project: {
            members: {
              some: {
                userId: session.user.id,
                role: {
                  in: ['OWNER', 'ADMIN', 'MEMBER'],
                },
              },
            },
          },
        },
      },
    });

    if (!column) {
      return NextResponse.json(
        { error: 'Недостаточно прав для изменения задач' },
        { status: 403 }
      );
    }

    // Обновление позиций задач в транзакции
    await prisma.$transaction(
      validatedData.tasks.map((task) => {
        const updateData: any = { position: task.position };
        if (task.columnId !== undefined) {
          updateData.columnId = task.columnId;
        }
        
        return prisma.task.update({
          where: { id: task.id },
          data: updateData,
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: 'Позиции задач обновлены',
    });
  } catch (error) {
    console.error('Ошибка при обновлении позиций задач:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Неверные данные',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}