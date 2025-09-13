import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Схема валидации для обновления задачи
const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  columnId: z.number().optional(),
  position: z.number().min(0).optional(),
  assignees: z.array(z.object({
    userId: z.number(),
    assignedAt: z.string().datetime()
  })).optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/tasks/[id] - Получение задачи
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const taskId = parseInt(params.id);
    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Некорректный ID задачи' },
        { status: 400 }
      );
    }

    // Получаем задачу с проверкой доступа
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          OR: [
            { ownerId: parseInt(session.user.id) },
            {
              members: {
                some: {
                  userId: parseInt(session.user.id)
                }
              }
            }
          ]
        }
      },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        attachments: true,
        subtasks: {
          orderBy: {
            position: 'asc'
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        },
        column: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Ошибка при получении задачи:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Обновление задачи
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const taskId = parseInt(params.id);
    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Некорректный ID задачи' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    // Проверяем существование задачи и права доступа
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          OR: [
            { ownerId: parseInt(session.user.id) },
            {
              members: {
                some: {
                  userId: parseInt(session.user.id),
                  role: { in: ['ADMIN', 'MEMBER'] }
                }
              }
            }
          ]
        }
      },
      include: {
        project: {
          select: {
            id: true,
            ownerId: true
          }
        }
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Задача не найдена или нет прав доступа' },
        { status: 404 }
      );
    }

    // Проверяем права на изменение
    const canManage = existingTask.project.ownerId === parseInt(session.user.id);
    if (!canManage) {
      // Проверяем роль участника
      const memberRole = await prisma.projectMember.findFirst({
        where: {
          projectId: existingTask.project.id,
          userId: parseInt(session.user.id)
        },
        select: { role: true }
      });

      if (!memberRole || memberRole.role === 'VIEWER') {
        return NextResponse.json(
          { error: 'Недостаточно прав для изменения задачи' },
          { status: 403 }
        );
      }
    }

    // Если изменяется колонка, проверяем её существование
    if (validatedData.columnId && validatedData.columnId !== existingTask.columnId) {
      const targetColumn = await prisma.column.findFirst({
        where: {
          id: validatedData.columnId,
          board: {
            projectId: existingTask.project.id
          }
        }
      });

      if (!targetColumn) {
        return NextResponse.json(
          { error: 'Целевая колонка не найдена' },
          { status: 400 }
        );
      }
    }

    // Выполняем обновление в транзакции
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Обновляем основные поля задачи
      const taskUpdate: any = {
        ...validatedData,
        updatedAt: new Date()
      };

      // Убираем assignees из основного обновления
      delete taskUpdate.assignees;

      const task = await tx.task.update({
        where: { id: taskId },
        data: taskUpdate,
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          project: {
            select: {
              id: true,
              name: true
            }
          },
          column: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        }
      });

      // Обновляем исполнителей, если они переданы
      if (validatedData.assignees !== undefined) {
        // Удаляем существующих исполнителей
        await tx.taskAssignee.deleteMany({
          where: { taskId }
        });

        // Добавляем новых исполнителей
        if (validatedData.assignees.length > 0) {
          await tx.taskAssignee.createMany({
            data: validatedData.assignees.map(assignee => ({
              taskId,
              userId: assignee.userId,
              assignedAt: new Date(assignee.assignedAt)
            }))
          });
        }

        // Получаем обновленную задачу с новыми исполнителями
        return await tx.task.findUnique({
          where: { id: taskId },
          include: {
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            },
            project: {
              select: {
                id: true,
                name: true
              }
            },
            column: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        });
      }

      return task;
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при обновлении задачи:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Удаление задачи
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const taskId = parseInt(params.id);
    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Некорректный ID задачи' },
        { status: 400 }
      );
    }

    // Проверяем существование задачи и права доступа
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          OR: [
            { ownerId: parseInt(session.user.id) },
            {
              members: {
                some: {
                  userId: parseInt(session.user.id),
                  role: { in: ['ADMIN', 'MEMBER'] }
                }
              }
            }
          ]
        }
      },
      include: {
        project: {
          select: {
            id: true,
            ownerId: true
          }
        }
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Задача не найдена или нет прав доступа' },
        { status: 404 }
      );
    }

    // Проверяем права на удаление
    const canManage = existingTask.project.ownerId === parseInt(session.user.id);
    if (!canManage) {
      // Проверяем роль участника
      const memberRole = await prisma.projectMember.findFirst({
        where: {
          projectId: existingTask.project.id,
          userId: parseInt(session.user.id)
        },
        select: { role: true }
      });

      if (!memberRole || memberRole.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Недостаточно прав для удаления задачи' },
          { status: 403 }
        );
      }
    }

    // Удаляем задачу в транзакции
    await prisma.$transaction(async (tx) => {
      // Удаляем связанные данные
      await tx.taskAssignee.deleteMany({ where: { taskId } });
      await tx.taskComment.deleteMany({ where: { taskId } });
      await tx.taskAttachment.deleteMany({ where: { taskId } });
      await tx.subtask.deleteMany({ where: { taskId } });
      
      // Удаляем саму задачу
      await tx.task.delete({ where: { id: taskId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении задачи:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}