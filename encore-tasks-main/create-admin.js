const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют переменные окружения Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    const adminEmail = 'axelencore@mail.ru';
    const adminPassword = 'Ad580dc6axelencore';
    const adminName = 'Admin User';
    
    console.log('🔍 Проверяем существующего пользователя...');
    
    // Проверяем существует ли пользователь
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Ошибка при проверке пользователя:', checkError);
      return;
    }
    
    // Хешируем пароль
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    
    if (existingUser) {
      console.log('👤 Пользователь найден, обновляем пароль и права...');
      
      // Обновляем существующего пользователя
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          role: 'admin',
          is_active: true,
          name: adminName
        })
        .eq('email', adminEmail)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Ошибка при обновлении пользователя:', updateError);
        return;
      }
      
      console.log('✅ Пользователь успешно обновлен:', {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        is_active: updatedUser.is_active
      });
    } else {
      console.log('➕ Создаем нового администратора...');
      
      // Создаем нового пользователя
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: adminEmail,
          password_hash: hashedPassword,
          name: adminName,
          role: 'admin',
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Ошибка при создании пользователя:', createError);
        return;
      }
      
      console.log('✅ Администратор успешно создан:', {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        is_active: newUser.is_active
      });
    }
    
    // Проверяем что пароль корректный
    console.log('🔐 Проверяем пароль...');
    const isPasswordValid = await bcrypt.compare(adminPassword, hashedPassword);
    console.log('✅ Пароль корректный:', isPasswordValid);
    
    console.log('\n🎉 Готово! Теперь можно войти с данными:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    
  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error);
  }
}

createAdminUser();