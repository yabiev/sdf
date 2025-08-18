import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import databaseAdapter from '@/lib/database-adapter-optimized';
import { createHash } from 'crypto';

// Получение текущего пользователя
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { userId } = authResult.user!;
    const user = await databaseAdapter.getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Преобразование в формат API с правильной типизацией
    const userResult = {
      id: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.is_active ? 'active' : 'inactive',
      avatar: user.avatar || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at
    };

    // Generate ETag based on user data
     const etag = createHash('md5')
       .update(JSON.stringify(userResult))
       .digest('hex');

    // Check if client has cached version
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === etag) {
      return new NextResponse(null, { status: 304 });
    }

    const response = NextResponse.json({ user: userResult });
    
    // Set caching headers
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'private, max-age=300, must-revalidate'); // 5 minutes
    response.headers.set('Vary', 'Authorization, Cookie');
    
    return response;

  } catch (error) {
    console.error('Ошибка получения текущего пользователя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}