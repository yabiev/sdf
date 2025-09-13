import { NextRequest, NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/lib/database-adapter';
import { verifyAuth } from '@/lib/auth';

const databaseAdapter = DatabaseAdapter.getInstance();

// Проверка доступа к доске
async function checkBoardAccess(boardId: string, userId: string) {
  const query = `
    SELECT pm.role, b.project_id
    FROM boards b
    JOIN project_members pm ON pm.project_id = b.project_id
    WHERE b.id = ? AND pm.user_id = ?
  `;
  
  const result = await databaseAdapter.query(query, [boardId, userId]);
  const rows = Array.isArray(result) ? result : (result.rows || []);
  return {
    hasAccess: rows.length > 0,
    role: rows[0]?.role || null,
    projectId: rows[0]?.project_id
  };
}

// GET /api/boards/[id]/columns - Получить колонки доски
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await databaseAdapter.initialize();
    const boardId = params.id;

    // Проверяем доступ к доске
    const accessCheck = await checkBoardAccess(boardId, authResult.user.userId);
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Получаем колонки доски
    const query = `
      SELECT id, name, position, color, board_id, created_at, updated_at
      FROM columns
      WHERE board_id = ?
      ORDER BY position ASC
    `;
    
    const result = await databaseAdapter.query(query, [boardId]);
    const columns = Array.isArray(result) ? result : (result.rows || []);

    return NextResponse.json({
      success: true,
      data: columns
    });

  } catch (error) {
    console.error('Error fetching board columns:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}