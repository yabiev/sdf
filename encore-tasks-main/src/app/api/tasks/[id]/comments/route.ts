import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Схема валидации для создания комментария
const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.number().optional(), // Для ответов на комментарии
});

// GET /api/tasks/[id]/comments - Получение комментариев задачи
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

    // Проверяем доступ к задаче
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
      select: { id: true }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена или нет доступа' },
        { status: 404 }
      );
    }

    // Получаем комментарии
    const comments = await prisma.taskComment.findMany({
      where: {
        taskId,
        parentId: null // Только корневые комментарии
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Ошибка при получении комментариев:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/comments - Создание комментария
export async function POST(
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
    const validatedData = createCommentSchema.parse(body);

    // Проверяем доступ к задаче
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
      select: { id: true }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Задача не найдена или нет доступа' },
        { status: 404 }
      );
    }

    // Если это ответ на комментарий, проверяем существование родительского комментария
    if (validatedData.parentId) {
      const parentComment = await prisma.taskComment.findFirst({
        where: {
          id: validatedData.parentId,
          taskId
        }
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Родительский комментарий не найден' },
          { status: 400 }
        );
      }
    }

    // Создаем комментарий
    const comment = await prisma.taskComment.create({
      data: {
        content: validatedData.content,
        taskId,
        authorId: parseInt(session.user.id),
        parentId: validatedData.parentId || null
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ошибка при создании комментария:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}