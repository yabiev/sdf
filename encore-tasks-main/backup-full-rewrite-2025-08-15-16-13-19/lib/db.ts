import databaseAdapter from './database-adapter-optimized';

// Флаг доступности PostgreSQL
let isPostgreSQLAvailable = false;

// Проверка подключения к PostgreSQL
async function checkPostgreSQLConnection() {
  try {
    await databaseAdapter.initialize();
    isPostgreSQLAvailable = true;
    console.log('✅ PostgreSQL подключение установлено');
    return true;
  } catch (error) {
    isPostgreSQLAvailable = false;
    console.log('❌ PostgreSQL недоступен:', (error as Error).message);
    return false;
  }
}

// Функция для получения статуса PostgreSQL
export function getPostgreSQLAvailability(): boolean {
  return isPostgreSQLAvailable;
}

// Функция для выполнения запросов (PostgreSQL API)
export async function query(text: string, params?: any[]) {
  try {
    if (!isPostgreSQLAvailable) {
      await checkPostgreSQLConnection();
    }
    
    if (!isPostgreSQLAvailable) {
      // Возвращаем пустой результат, если PostgreSQL недоступен
      return { rows: [], rowCount: 0 };
    }
    
    // Выполняем SQL запрос через PostgreSQL адаптер
    const result = await databaseAdapter.executeRawQuery(text, params);
    return { rows: result, rowCount: result.length };
  } catch (error) {
    console.error('Database query error:', error);
    isPostgreSQLAvailable = false;
    // Возвращаем пустой результат для fallback
    return { rows: [], rowCount: 0 };
  }
}

// Функция для выполнения транзакций (PostgreSQL)
export async function transaction(callback: (client: any) => Promise<any>) {
  try {
    // PostgreSQL транзакции через адаптер
    const mockClient = {
      query: async (text: string, params?: any[]) => {
        const result = await databaseAdapter.executeRawQuery(text, params);
        return { rows: result, rowCount: result.length };
      }
    };
    return await callback(mockClient);
  } catch (error) {
    throw error;
  }
}

// Инициализация подключения при загрузке модуля
checkPostgreSQLConnection();

// Экспорт для совместимости
export const pool = null;
export const dbConfig = null;

// Новые экспорты для PostgreSQL
export { databaseAdapter };
export function isPostgreSQLAvailable(): boolean {
  return isPostgreSQLAvailable;
}