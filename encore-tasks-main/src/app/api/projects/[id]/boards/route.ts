import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// Схема валидации для получения досок проекта
const getBoardsSchema = z.object({
  includeColumns: z.boolean().optional().default(false),
  includeTasks: z.boolean().optional().default(false),
});

// GET /api/projects/[id]/boards - получить доски проекта
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

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Неверный ID проекта' },
        { status: 400 }
      );
    }

    // Парсинг query параметров
    const { searchParams } = new URL(request.url);
    const queryData = {
      includeColumns: searchParams.get('includeColumns') === 'true',
      includeTasks: searchParams.get('includeTasks') === 'true',
    };

    const validatedQuery = getBoardsSchema.parse(queryData);

    // Проверка доступа к проекту
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: session.user.id,
      },
    });

    if (!projectMember) {
      return NextResponse.json(
        { error: 'Доступ к проекту запрещен' },
        { status: 403 }
      );
    }

    // Построение запроса с условными включениями
    const includeOptions: any = {};
    
    if (validatedQuery.includeColumns) {
      includeOptions.columns = {
        orderBy: { position: 'asc' },
      };
      
      if (validatedQuery.includeTasks) {
        includeOptions.columns.include = {
          tasks: {
            orderBy: { position: 'asc' },
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
            },
          },
        };
      }
    }

    // Получение досок проекта
    const boards = await prisma.board.findMany({
      where: {
        projectId,
      },
      include: includeOptions,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: boards,
    });
  } catch (error) {
    console.error('Ошибка при получении досок проекта:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Неверные параметры запроса',
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

// POST /api/projects/[id]/boards - создать новую доску в проекте
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

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Неверный ID проекта' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const boardData = {
      name: body.name,
      description: body.description || '',
      color: body.color || '#3B82F6',
    };

    // Валидация данных доски
    if (!boardData.name || boardData.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Название доски обязательно' },
        { status: 400 }
      );
    }

    // Проверка прав на создание досок в проекте
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: session.user.id,
        role: {
          in: ['OWNER', 'ADMIN', 'MEMBER'],
        },
      },
    });

    if (!projectMember) {
      return NextResponse.json(
        { error: 'Недостаточно прав для создания доски' },
        { status: 403 }
      );
    }

    // Создание доски с базовыми колонками
    const result = await prisma.$transaction(async (tx) => {
      // Создание доски
      const board = await tx.board.create({
        data: {
          name: boardData.name.trim(),
          description: boardData.description.trim(),
          color: boardData.color,
          projectId,
          createdById: session.user.id,
        },
      });

      // Создание базовых колонок
      const defaultColumns = [
        { name: 'К выполнению', type: 'TODO', position: 0 },
        { name: 'В работе', type: 'IN_PROGRESS', position: 1 },
        { name: 'Выполнено', type: 'DONE', position: 2 },
      ];

      const columns = await Promise.all(
        defaultColumns.map((col) =>
          tx.column.create({
            data: {
              name: col.name,
              type: col.type,
              position: col.position,
              boardId: board.id,
            },
          })
        )
      );

      return {
        ...board,
        columns,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Ошибка при создании доски:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}