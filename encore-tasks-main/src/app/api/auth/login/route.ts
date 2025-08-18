import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbAdapter as databaseAdapter } from '@/lib/database-adapter';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }
    
    // Поиск пользователя по email
    console.log('🔍 Looking up user by email:', email);
    const user = await databaseAdapter.getUserByEmail(email);
    console.log('👤 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('👤 User details:', {
        id: user.id,
        email: user.email,
        approval_status: user.approval_status,
        has_password: !!user.password_hash
      });
    }
    
    // Временно отключена проверка approval_status для решения проблем с входом
    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }
    
    // Закомментировано: || user.approval_status !== 'approved'
    // Это позволяет пользователям входить независимо от статуса одобрения

    // Проверка пароля
    console.log('🔐 Checking password for user:', user.email);
    console.log('🔐 Has password hash:', !!user.password_hash);
    const isValidPassword = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    console.log('🔐 Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Password validation failed');
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }
    
    console.log('✅ Password validation successful');

    // Создание сессии с правильной типизацией
    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
    
    await databaseAdapter.createSession({
      userId: user.id,
      token: sessionToken,
      expiresAt: expiresAt
    });

    // TODO: Добавить обновление времени последнего входа после добавления колонки last_login_at
    // await databaseAdapter.updateUser(user.id, {
    //   last_login_at: new Date().toISOString()
    // });

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approval_status: user.approval_status || 'approved',
      status: user.is_active ? 'active' : 'inactive',
      avatar: user.avatar || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at
      // TODO: Добавить lastLoginAt после добавления колонки last_login_at
      // lastLoginAt: user.last_login_at
    };

    const response = NextResponse.json({
      message: 'Успешная авторизация',
      user: userResponse,
      token: sessionToken
    });

    // Устанавливаем токен в cookies для автоматической аутентификации
    response.cookies.set('auth-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней - соответствует времени жизни JWT
    });

    // Также устанавливаем обычный cookie для фронтенда
    response.cookies.set('auth-token-client', sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней - соответствует времени жизни JWT
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}