const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

console.log('=== СОЗДАНИЕ СЕССИИ В SUPABASE ===');

// Supabase конфигурация
const supabaseUrl = 'https://itzprrsqfklkkjeubiot.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0enBycnNxZmtsa2tqZXViaW90Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTUyMTYyMSwiZXhwIjoyMDcxMDk3NjIxfQ.Crer8i5hJFAl2eFzyYVY7cVT6h2f776Y2LC70heH6Xw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret
const JWT_SECRET = 'your-jwt-secret-key-development';

async function createSession() {
  try {
    // Найдем пользователя с нужным ID
    const targetUserId = '3a028dd5-5327-457a-b8d4-11c7e2c706ce';
    
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .single();
    
    if (userError || !user) {
      console.log('❌ Пользователь с ID', targetUserId, 'не найден:', userError?.message);
      // Попробуем найти любого пользователя
      const { data: anyUser, error: anyUserError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single();
        
      if (anyUserError || !anyUser) {
        console.log('❌ Пользователи вообще не найдены:', anyUserError?.message);
        return;
      }
      user = anyUser;
      console.log('📋 Найден другой пользователь:', user.id, user.email);
    }
    
    console.log('👤 Найден пользователь:', user.id, user.email);
    
    // Создаем JWT токен
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role || 'user',
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 часа
    };
    
    const jwtToken = jwt.sign(payload, JWT_SECRET);
    console.log('🔑 Создан JWT токен:', jwtToken);
    
    // Удаляем старые сессии для этого пользователя
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.log('⚠️ Ошибка при удалении старых сессий:', deleteError.message);
    } else {
      console.log('🗑️ Старые сессии удалены');
    }
    
    // Создаем новую сессию
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
    const createdAt = new Date();
    
    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert({
        session_token: jwtToken,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        created_at: createdAt.toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Ошибка при создании сессии:', insertError.message);
      return;
    }
    
    console.log('✅ Сессия создана успешно');
    
    // Проверяем созданную сессию
    const { data: checkSession, error: checkError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_token', jwtToken)
      .single();
    
    if (checkError || !checkSession) {
      console.log('❌ Сессия не найдена после создания:', checkError?.message);
    } else {
      console.log('✅ Сессия найдена в БД:', {
        session_token: checkSession.session_token.substring(0, 50) + '...',
        user_id: checkSession.user_id,
        expires_at: checkSession.expires_at
      });
    }
    
    console.log('\n🎯 Используйте этот токен для тестирования:');
    console.log(jwtToken);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

createSession();