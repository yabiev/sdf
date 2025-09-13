import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { DatabaseAdapter } from './database-adapter';

const databaseAdapter = DatabaseAdapter.getInstance();

interface AuthResult {
  success: boolean;
  user?: {
    userId: string;
    email: string;
    role: string;
    name: string;
  };
  error?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Отладка: показать все cookies
    console.log('=== DEBUG COOKIES ===');
    console.log('All cookies:', request.cookies.getAll());
    console.log('Cookie names:', request.cookies.getAll().map(c => c.name));
    console.log('auth-token cookie:', request.cookies.get('auth-token'));
    console.log('auth-token-client cookie:', request.cookies.get('auth-token-client'));
    console.log('Authorization header:', request.headers.get('authorization'));
    
    // Получение токена из cookie или заголовка Authorization
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    console.log('Auth token found:', !!token);
    console.log('Token value (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
    if (!token) {
      console.log('No auth token found in cookies or headers');
      return {
        success: false,
        error: 'Токен аутентификации не найден'
      };
    }

    // Проверка JWT токена
    let decoded: any;
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    console.log('Using JWT_SECRET:', jwtSecret);
    try {
      decoded = jwt.verify(token, jwtSecret);
      console.log('JWT verified successfully for user:', decoded.userId);
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError);
      return {
        success: false,
        error: 'Невалидный токен'
      };
    }

    // Используем оптимизированный адаптер для работы с сессиями
    await databaseAdapter.initialize();

    try {
        // Ищем сессию через адаптер
         const session = await databaseAdapter.getSessionByToken(token);
         console.log('Session found:', !!session);
         console.log('Session object:', session);
         console.log('Session userId:', session?.user_id);

         if (!session) {
           console.log('Session not found or expired for token');
           return { success: false, error: 'Сессия не найдена или истекла' };
         }

       // Получаем пользователя через адаптер
       const user = await databaseAdapter.getUserById(session.user_id);

      if (!user) {
        return { success: false, error: 'Пользователь не найден' };
      }

      // Проверяем статус одобрения пользователя
      console.log('User data:', user);
      console.log('User isApproved:', user.isApproved, 'type:', typeof user.isApproved);
      console.log('User role:', user.role);
      
      // Используем approval_status для PostgreSQL
      const isApproved = user.isApproved !== undefined ? Boolean(user.isApproved) : true;
      console.log('Final isApproved:', isApproved);
      
      if (!isApproved && user.role !== 'admin') {
        console.log('User not approved and not admin');
        return {
          success: false,
          error: 'Пользователь не одобрен'
        };
      }

      return {
        success: true,
        user: {
          userId: String(user.id),
          email: user.email,
          role: user.role,
          name: user.name
        }
      };
    } catch (error) {
      console.error('Auth error:', error);
      return { success: false, error: 'Ошибка аутентификации' };
    }

  } catch (error) {
    console.error('Ошибка проверки аутентификации:', error);
    return {
      success: false,
      error: 'Внутренняя ошибка сервера'
    };
  }
}

// Проверка прав доступа к проекту
export async function verifyProjectAccess(
  userId: string, 
  projectId: string, 
  requiredRole?: 'owner' | 'admin' | 'member'
): Promise<{ hasAccess: boolean; userRole?: string }> {
  try {
    await databaseAdapter.initialize();

    // Получаем проекты через адаптер
     const projects = await databaseAdapter.getAllProjects();
     const project = projects.find(p => p.id === projectId);

     if (!project) {
       return { hasAccess: false };
     }

     // Проверяем, является ли пользователь владельцем
     if (project.created_by === userId) {
       return { hasAccess: true, userRole: 'owner' };
     }

     // Получаем участников проекта через getUserProjects
     const userProjects = await databaseAdapter.getUserProjects(userId);
     const hasAccess = userProjects.some((p: any) => p.id === projectId);

    if (!hasAccess) {
       return { hasAccess: false };
     }

     // Для упрощения, считаем что у пользователя есть доступ как участник
     const userRole = 'member';

     // Проверка требуемой роли
    if (requiredRole) {
      const roleHierarchy = { owner: 3, admin: 2, member: 1 };
      const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole];
      
      if (userRoleLevel < requiredRoleLevel) {
        return { hasAccess: false, userRole };
      }
    }

    return { hasAccess: true, userRole };

  } catch (error) {
    console.error('Ошибка проверки доступа к проекту:', error);
    return { hasAccess: false };
  }
}

// Middleware для проверки роли администратора
export async function requireAdmin(request: NextRequest) {
  const authResult = await verifyAuth(request);
  
  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  if (authResult.user!.role !== 'admin') {
    return { success: false, error: 'Требуются права администратора' };
  }

  return { success: true, user: authResult.user };
}