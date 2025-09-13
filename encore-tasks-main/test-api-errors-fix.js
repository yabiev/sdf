/**
 * Скрипт для диагностики и исправления ошибок 500 в API колонок и досок
 * Проверяет структуру таблиц, находит проблемы с доступом и исправляет их
 */

const axios = require('axios');
const assert = require('assert');
const { Pool } = require('pg');

// Конфигурация
const CONFIG = {
  apiUrl: 'http://localhost:3001',
  testUser: {
    email: 'admin@example.com',
    password: 'admin123'
  },
  timeout: 30000
};

class APIErrorsFixer {
  constructor() {
    this.authToken = null;
    this.testResults = [];
    this.fixedIssues = [];
    this.foundIssues = [];
    
    // Инициализация подключения к базе данных
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'encore_tasks',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'fix': '🔧'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async authenticate() {
    this.log('Выполняю авторизацию...', 'info');
    try {
      const response = await axios.post(`${CONFIG.apiUrl}/api/auth/login`, {
        email: CONFIG.testUser.email,
        password: CONFIG.testUser.password
      });
      
      if (response.data.token) {
        this.authToken = response.data.token;
        this.log('Авторизация успешна', 'success');
        return true;
      }
    } catch (error) {
      this.log(`Ошибка авторизации: ${error.message}`, 'error');
      
      // Попробуем альтернативные учетные данные
      try {
        const altResponse = await axios.post(`${CONFIG.apiUrl}/api/auth/login`, {
          email: 'axelencore@mail.ru',
          password: 'Ad580dc6axelencore'
        });
        
        if (altResponse.data.token) {
          this.authToken = altResponse.data.token;
          this.log('Авторизация с альтернативными данными успешна', 'success');
          return true;
        }
      } catch (altError) {
        this.log(`Альтернативная авторизация не удалась: ${altError.message}`, 'error');
      }
    }
    return false;
  }

  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async checkDatabaseStructure() {
    this.log('Проверяю структуру таблиц базы данных...', 'info');
    
    try {
      // Проверяем доступность API для получения информации о таблицах
      const response = await axios.get(`${CONFIG.apiUrl}/api/debug/tables`, {
        headers: this.getAuthHeaders(),
        timeout: CONFIG.timeout
      });
      
      this.log('Структура таблиц получена успешно', 'success');
      return response.data;
    } catch (error) {
      this.log(`Не удалось получить структуру таблиц: ${error.message}`, 'warning');
      
      // Альтернативный способ - проверка через прямые API запросы
      return await this.checkTablesIndirectly();
    }
  }

  async checkTablesIndirectly() {
    this.log('Проверяю таблицы через косвенные запросы...', 'info');
    
    const tableChecks = {
      projects: false,
      project_members: false,
      boards: false,
      columns: false,
      tasks: false
    };

    try {
      // Проверяем таблицу projects
      const projectsResponse = await axios.get(`${CONFIG.apiUrl}/api/projects`, {
        headers: this.getAuthHeaders()
      });
      tableChecks.projects = projectsResponse.status === 200;
      this.log('Таблица projects доступна', 'success');
    } catch (error) {
      this.log(`Проблема с таблицей projects: ${error.response?.status || error.message}`, 'error');
      this.foundIssues.push('Таблица projects недоступна');
    }

    try {
      // Проверяем таблицу boards через API
      const boardsResponse = await axios.get(`${CONFIG.apiUrl}/api/boards`, {
        headers: this.getAuthHeaders()
      });
      tableChecks.boards = boardsResponse.status === 200;
      this.log('Таблица boards доступна', 'success');
    } catch (error) {
      this.log(`Проблема с таблицей boards: ${error.response?.status || error.message}`, 'error');
      this.foundIssues.push('Таблица boards недоступна');
    }

    return tableChecks;
  }

  async findAccessIssues() {
    this.log('Ищу проблемы с доступом к проектам...', 'info');
    
    try {
      // Получаем список проектов
      const projectsResponse = await axios.get(`${CONFIG.apiUrl}/api/projects`, {
        headers: this.getAuthHeaders()
      });
      
      // Отладочная информация о структуре ответа
      this.log(`Структура ответа API проектов: ${JSON.stringify(projectsResponse.data, null, 2)}`, 'info');
      
      let projects = [];
      if (Array.isArray(projectsResponse.data)) {
        projects = projectsResponse.data;
      } else if (projectsResponse.data && projectsResponse.data.data && Array.isArray(projectsResponse.data.data.projects)) {
        projects = projectsResponse.data.data.projects;
      } else if (projectsResponse.data && Array.isArray(projectsResponse.data.projects)) {
        projects = projectsResponse.data.projects;
      } else if (projectsResponse.data && Array.isArray(projectsResponse.data.data)) {
        projects = projectsResponse.data.data;
      } else {
        this.log(`Неожиданная структура ответа API проектов: ${typeof projectsResponse.data}`, 'warning');
        projects = [];
      }
      
      this.log(`Найдено проектов: ${projects.length}`, 'info');
      
      if (projects.length === 0) {
        this.foundIssues.push('Нет доступных проектов для пользователя');
        return [];
      }

      const accessIssues = [];
      
      // Проверяем доступ к API колонок для каждого проекта
      for (const project of projects) {
        try {
          // Сначала получаем доски проекта
          const boardsResponse = await axios.get(`${CONFIG.apiUrl}/api/boards?projectId=${project.id}`, {
            headers: this.getAuthHeaders()
          });
          
          let boards = [];
          if (Array.isArray(boardsResponse.data)) {
            boards = boardsResponse.data;
          } else if (boardsResponse.data && Array.isArray(boardsResponse.data.data)) {
            boards = boardsResponse.data.data;
          } else if (boardsResponse.data && Array.isArray(boardsResponse.data.boards)) {
            boards = boardsResponse.data.boards;
          }
          
          // Если нет досок, создаем тестовую доску
          if (boards.length === 0) {
            try {
              const createBoardResponse = await axios.post(`${CONFIG.apiUrl}/api/boards`, {
                name: 'Test Board for API Check',
                description: 'Temporary board for testing API access',
                project_id: project.id
              }, {
                headers: this.getAuthHeaders()
              });
              
              if (createBoardResponse.data && createBoardResponse.data.data) {
                boards = [createBoardResponse.data.data];
              } else if (createBoardResponse.data) {
                boards = [createBoardResponse.data];
              }
            } catch (createError) {
              this.log(`Не удалось создать тестовую доску для проекта ${project.id}: ${createError.message}`, 'warning');
              continue;
            }
          }
          
          // Проверяем доступ к API колонок
          if (boards.length > 0) {
            try {
              await axios.get(`${CONFIG.apiUrl}/api/columns?boardId=${boards[0].id}`, {
                headers: this.getAuthHeaders()
              });
            } catch (columnError) {
              if (columnError.response?.status === 500) {
                accessIssues.push({
                  projectId: project.id,
                  projectName: project.name,
                  boardId: boards[0].id,
                  issue: 'Ошибка 500 при доступе к API колонок',
                  error: columnError.message
                });
              }
            }
          }
          
          if (boardsResponse.status !== 200) {
            accessIssues.push({
              projectId: project.id,
              projectName: project.name,
              issue: 'Нет доступа к доскам проекта'
            });
          }
        } catch (error) {
          if (error.response?.status === 500) {
            accessIssues.push({
              projectId: project.id,
              projectName: project.name,
              issue: 'Ошибка 500 при доступе к доскам',
              error: error.message
            });
          }
        }
      }
      
      this.foundIssues.push(...accessIssues.map(issue => 
        `Проект ${issue.projectName} (ID: ${issue.projectId}): ${issue.issue}`
      ));
      
      this.log(`Найдено проблем с доступом: ${accessIssues.length}`, 'info');
      
      return accessIssues;
    } catch (error) {
      this.log(`Ошибка при поиске проблем доступа: ${error.message}`, 'error');
      this.foundIssues.push(`Ошибка поиска проблем доступа: ${error.message}`);
      return [];
    }
  }

  async fixAccessIssues() {
    try {
      this.log('Исправляю проблемы с доступом...', 'fix');
      
      if (this.foundIssues.length === 0) {
        this.log('Нет проблем для исправления', 'info');
        return;
      }
      
      this.log(`Найдено проблем для исправления: ${this.foundIssues.length}`, 'info');
      // Получаем информацию о текущем пользователе
      const userResponse = await axios.get(`${CONFIG.apiUrl}/api/auth/me`, {
        headers: this.getAuthHeaders()
      });
      
      let currentUser;
      if (userResponse.data && userResponse.data.data) {
        currentUser = userResponse.data.data;
      } else if (userResponse.data && userResponse.data.user) {
        currentUser = userResponse.data.user;
      } else {
        currentUser = userResponse.data;
      }
      
      this.log(`Ответ API /auth/me: ${JSON.stringify(userResponse.data)}`, 'info');
      this.log(`Текущий пользователь: ${currentUser?.email || 'undefined'} (ID: ${currentUser?.id || 'undefined'})`, 'info');
      
      if (!currentUser || !currentUser.id) {
        this.log('Не удалось получить информацию о текущем пользователе', 'error');
        this.foundIssues.push('Не удалось получить информацию о текущем пользователе');
        return;
      }
      
      // Получаем список всех проектов
      const projectsResponse = await axios.get(`${CONFIG.apiUrl}/api/projects`, {
        headers: this.getAuthHeaders()
      });
      
      let projects = [];
      if (Array.isArray(projectsResponse.data)) {
        projects = projectsResponse.data;
      } else if (projectsResponse.data && projectsResponse.data.data && Array.isArray(projectsResponse.data.data.projects)) {
        projects = projectsResponse.data.data.projects;
      } else if (projectsResponse.data && Array.isArray(projectsResponse.data.projects)) {
        projects = projectsResponse.data.projects;
      } else if (projectsResponse.data && Array.isArray(projectsResponse.data.data)) {
        projects = projectsResponse.data.data;
      } else {
        this.log(`Неожиданная структура ответа API проектов в fixAccessIssues: ${typeof projectsResponse.data}`, 'warning');
        projects = [];
      }
      
      for (const project of projects) {
        try {
          // Проверяем, есть ли пользователь в project_members
          const membersResponse = await axios.get(`${CONFIG.apiUrl}/api/projects/${project.id}/members`, {
            headers: this.getAuthHeaders()
          });
          
          const members = membersResponse.data.members || membersResponse.data || [];
          const userIsMember = members.some(member => 
            member.user_id === currentUser.id || member.email === currentUser.email
          );
          
          if (!userIsMember) {
            // Добавляем пользователя в проект
            await this.addUserToProject(project.id, currentUser.id, currentUser.email);
          }
        } catch (error) {
          if (error.response?.status === 404) {
            // API для членов проекта не существует, попробуем другой подход
            await this.addUserToProjectDirect(project.id, currentUser.id, currentUser.email);
          } else {
            this.log(`Ошибка при проверке членства в проекте ${project.id}: ${error.message}`, 'warning');
          }
        }
      }
    } catch (error) {
      this.log(`Ошибка при исправлении доступа: ${error.message}`, 'error');
    }
  }

  async addUserToProject(projectId, userId, userEmail) {
    try {
      const response = await axios.post(`${CONFIG.apiUrl}/api/projects/${projectId}/members`, {
        user_id: userId,
        email: userEmail,
        role: 'admin'
      }, {
        headers: this.getAuthHeaders()
      });
      
      if (response.status === 200 || response.status === 201) {
        this.log(`Пользователь ${userEmail} добавлен в проект ${projectId}`, 'fix');
        this.fixedIssues.push(`Добавлен доступ к проекту ${projectId}`);
      }
    } catch (error) {
      this.log(`Не удалось добавить пользователя в проект ${projectId}: ${error.message}`, 'warning');
    }
  }

  async addUserToProjectDirect(projectId, userId, userEmail) {
    // Альтернативный способ добавления через прямой API
    try {
      const response = await axios.post(`${CONFIG.apiUrl}/api/debug/add-project-member`, {
        project_id: projectId,
        user_id: userId,
        email: userEmail,
        role: 'admin'
      }, {
        headers: this.getAuthHeaders()
      });
      
      if (response.status === 200 || response.status === 201) {
        this.log(`Пользователь ${userEmail} добавлен в проект ${projectId} (прямой способ)`, 'fix');
        this.fixedIssues.push(`Добавлен доступ к проекту ${projectId} (прямой способ)`);
      }
    } catch (error) {
      this.log(`Прямое добавление в проект ${projectId} не удалось: ${error.message}`, 'warning');
      // Попробуем прямое исправление через SQL
      await this.addUserToProjectSQL(projectId, userId, userEmail);
    }
  }

  async addUserToProjectSQL(projectId, userId, userEmail) {
    // Прямое исправление через SQL запросы
    try {
      this.log(`Попытка прямого SQL исправления для проекта ${projectId}...`, 'info');
      
      // Проверяем, существует ли уже запись
      const checkQuery = `
        SELECT COUNT(*) as count 
        FROM project_members 
        WHERE project_id = $1 AND user_id = $2;
      `;
      
      const checkResult = await this.pool.query(checkQuery, [projectId, userId]);
      
      if (checkResult.rows[0].count > 0) {
        this.log(`Пользователь ${userEmail} уже является членом проекта ${projectId}`, 'info');
        return;
      }
      
      // Добавляем пользователя в проект
      const insertQuery = `
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, 'admin')
        ON CONFLICT (project_id, user_id) DO NOTHING;
      `;
      
      const result = await this.pool.query(insertQuery, [projectId, userId]);
      
      if (result.rowCount > 0) {
        this.log(`Пользователь ${userEmail} добавлен в проект ${projectId} через SQL`, 'fix');
        this.fixedIssues.push(`Добавлен доступ к проекту ${projectId} через SQL`);
      } else {
        this.log(`Пользователь ${userEmail} уже был членом проекта ${projectId}`, 'info');
      }
      
    } catch (error) {
      this.log(`SQL исправление для проекта ${projectId} не удалось: ${error.message}`, 'error');
    }
  }

  async testColumnsAPI() {
    this.log('Тестирую API колонок...', 'info');
    
    let board;
    
    try {
      // Получаем список проектов
      const projectsResponse = await axios.get(`${CONFIG.apiUrl}/api/projects`, {
        headers: this.getAuthHeaders()
      });
      
      let projects = [];
      if (Array.isArray(projectsResponse.data)) {
        projects = projectsResponse.data;
      } else if (projectsResponse.data && projectsResponse.data.data && Array.isArray(projectsResponse.data.data.projects)) {
        projects = projectsResponse.data.data.projects;
      } else if (projectsResponse.data && Array.isArray(projectsResponse.data.projects)) {
        projects = projectsResponse.data.projects;
      } else if (projectsResponse.data && Array.isArray(projectsResponse.data.data)) {
        projects = projectsResponse.data.data;
      } else {
        this.log(`Неожиданная структура ответа API проектов в testColumnsAPI: ${typeof projectsResponse.data}`, 'warning');
        projects = [];
      }
      
      if (projects.length === 0) {
        this.log('Нет проектов для тестирования API колонок', 'warning');
        return false;
      }
      
      const project = projects[0];
      this.log(`Используется проект: ${project?.name || project?.id || 'неизвестный'}`, 'info');
      
      // Получаем доски проекта
      const boardsResponse = await axios.get(`${CONFIG.apiUrl}/api/boards?projectId=${project.id}`, {
        headers: this.getAuthHeaders()
      });
      
      this.log(`Ответ API досок: статус ${boardsResponse.status}`, 'info');
      this.log(`Структура ответа: success=${boardsResponse.data.success}, есть data=${!!boardsResponse.data.data}, есть boards=${!!boardsResponse.data.boards}`, 'info');
      
      let boards = [];
      if (boardsResponse.data.data && boardsResponse.data.data.boards && Array.isArray(boardsResponse.data.data.boards)) {
        boards = boardsResponse.data.data.boards;
      } else if (boardsResponse.data.boards && Array.isArray(boardsResponse.data.boards)) {
        boards = boardsResponse.data.boards;
      } else if (boardsResponse.data.data && Array.isArray(boardsResponse.data.data)) {
        boards = boardsResponse.data.data;
      } else if (Array.isArray(boardsResponse.data)) {
        boards = boardsResponse.data;
      } else {
        this.log(`Неожиданная структура ответа API досок: ${JSON.stringify(boardsResponse.data)}`, 'warning');
        boards = [];
      }
      
      this.log(`Найдено досок: ${boards.length}`, 'info');
      if (boards.length > 0) {
        this.log(`Первая доска: ID=${boards[0].id}, name=${boards[0].name}`, 'info');
        this.log(`Структура первой доски: ${JSON.stringify(boards[0])}`, 'info');
      }
      
      let board;
      if (boards.length === 0) {
        this.log('Нет досок для тестирования API колонок, создаю тестовую доску...', 'info');
        
        // Создаем тестовую доску
        this.log(`Создаю тестовую доску для проекта ${project.id}...`, 'info');
        const createBoardResponse = await axios.post(`${CONFIG.apiUrl}/api/boards`, {
          name: 'Тестовая доска для колонок',
          description: 'Временная доска для тестирования API колонок',
          project_id: project.id
        }, {
          headers: this.getAuthHeaders()
        });
        
        this.log(`Ответ создания доски: статус ${createBoardResponse.status}, данные: ${JSON.stringify(createBoardResponse.data)}`, 'info');
        
        if (createBoardResponse.status === 200 || createBoardResponse.status === 201) {
          const boardId = createBoardResponse.data?.id || createBoardResponse.data?.data?.id;
          if (boardId) {
            board = { id: boardId, name: 'Тестовая доска для колонок' };
            this.log('Тестовая доска создана для тестирования API колонок', 'success');
          } else {
            this.log('Не удалось получить ID созданной доски', 'error');
            return false;
          }
        } else {
          this.log('Не удалось создать тестовую доску', 'error');
          return false;
        }
      } else {
        board = boards[0];
        this.log(`Используется существующая доска: ${board?.name || board?.id || 'неизвестная'}`, 'info');
      }
      
      if (!board || !board.id) {
        this.log('Доска не найдена или не имеет ID для тестирования API колонок', 'warning');
        return false;
      }
      
      // Тестируем получение колонок
      const columnsResponse = await axios.get(`${CONFIG.apiUrl}/api/columns?boardId=${board.id}`, {
        headers: this.getAuthHeaders()
      });
      
      if (columnsResponse.status === 200) {
        this.log('API колонок работает корректно (GET)', 'success');
        
        // Тестируем создание колонки
        const createResponse = await axios.post(`${CONFIG.apiUrl}/api/columns`, {
          title: 'Тестовая колонка',
          board_id: board.id,
          position: 0
        }, {
          headers: this.getAuthHeaders()
        });
        
        if (createResponse.status === 200 || createResponse.status === 201) {
          this.log('API колонок работает корректно (POST)', 'success');
          
          // Удаляем тестовую колонку
          const columnId = createResponse.data?.id || createResponse.data?.data?.id;
          if (columnId) {
            await axios.delete(`${CONFIG.apiUrl}/api/columns/${columnId}`, {
              headers: this.getAuthHeaders()
            });
            this.log('Тестовая колонка удалена', 'info');
          }
          
          // Удаляем тестовую доску, если она была создана
          if (board && board.name === 'Тестовая доска для колонок') {
            await axios.delete(`${CONFIG.apiUrl}/api/boards/${board.id}`, {
              headers: this.getAuthHeaders()
            });
            this.log('Тестовая доска удалена', 'info');
          }
          
          return true;
        }
      }
    } catch (error) {
      this.log(`Ошибка при тестировании API колонок: ${error.response?.status || error.message}`, 'error');
      this.log(`Стек ошибки: ${error.stack}`, 'error');
      if (error.response?.status === 500) {
        this.foundIssues.push('API колонок возвращает ошибку 500');
      }
      
      // Удаляем тестовую доску в случае ошибки, если она была создана
      try {
        if (typeof board !== 'undefined' && board && board.id && board.name === 'Тестовая доска для колонок') {
          await axios.delete(`${CONFIG.apiUrl}/api/boards/${board.id}`, {
            headers: this.getAuthHeaders()
          });
          this.log('Тестовая доска удалена после ошибки', 'info');
        }
      } catch (cleanupError) {
        this.log(`Не удалось удалить тестовую доску: ${cleanupError.message}`, 'warning');
      }
      
      return false;
    }
    
    return false;
  }

  async testBoardsAPI() {
    this.log('Тестирую API досок...', 'info');
    
    try {
      // Получаем список проектов
      const projectsResponse = await axios.get(`${CONFIG.apiUrl}/api/projects`, {
        headers: this.getAuthHeaders()
      });
      
      let projects = [];
      if (Array.isArray(projectsResponse.data)) {
        projects = projectsResponse.data;
      } else if (projectsResponse.data && projectsResponse.data.data && Array.isArray(projectsResponse.data.data.projects)) {
        projects = projectsResponse.data.data.projects;
      } else if (projectsResponse.data && Array.isArray(projectsResponse.data.projects)) {
        projects = projectsResponse.data.projects;
      } else if (projectsResponse.data && Array.isArray(projectsResponse.data.data)) {
        projects = projectsResponse.data.data;
      } else {
        this.log(`Неожиданная структура ответа API проектов в testBoardsAPI: ${typeof projectsResponse.data}`, 'warning');
        projects = [];
      }
      
      if (projects.length === 0) {
        this.log('Нет проектов для тестирования API досок', 'warning');
        return false;
      }
      
      const project = projects[0];
      
      // Тестируем получение досок
      const boardsResponse = await axios.get(`${CONFIG.apiUrl}/api/boards?projectId=${project.id}`, {
        headers: this.getAuthHeaders()
      });
      
      if (boardsResponse.status === 200) {
        this.log('API досок работает корректно (GET)', 'success');
        
        // Тестируем создание доски
        const createResponse = await axios.post(`${CONFIG.apiUrl}/api/boards`, {
          name: 'Тестовая доска',
          description: 'Описание тестовой доски',
          project_id: project.id
        }, {
          headers: this.getAuthHeaders()
        });
        
        if (createResponse.status === 200 || createResponse.status === 201) {
          this.log('API досок работает корректно (POST)', 'success');
          
          // Тестируем удаление доски
          const boardId = createResponse.data?.id || createResponse.data?.data?.id;
          if (boardId) {
            const deleteResponse = await axios.delete(`${CONFIG.apiUrl}/api/boards/${boardId}`, {
              headers: this.getAuthHeaders()
            });
            
            if (deleteResponse.status === 200) {
              this.log('API досок работает корректно (DELETE)', 'success');
              return true;
            }
          }
        }
      }
    } catch (error) {
      this.log(`Ошибка при тестировании API досок: ${error.response?.status || error.message}`, 'error');
      if (error.response?.status === 500) {
        this.foundIssues.push('API досок возвращает ошибку 500');
      }
      return false;
    }
    
    return false;
  }

  async generateReport() {
    this.log('Генерирую отчет...', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      foundIssues: this.foundIssues,
      fixedIssues: this.fixedIssues,
      testResults: this.testResults,
      summary: {
        totalIssuesFound: this.foundIssues.length,
        totalIssuesFixed: this.fixedIssues.length,
        apiTestsPassed: this.testResults.filter(r => r.success).length,
        apiTestsFailed: this.testResults.filter(r => !r.success).length
      }
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 ОТЧЕТ О ДИАГНОСТИКЕ И ИСПРАВЛЕНИИ ОШИБОК API');
    console.log('='.repeat(80));
    
    console.log('\n🔍 НАЙДЕННЫЕ ПРОБЛЕМЫ:');
    if (this.foundIssues.length === 0) {
      console.log('   ✅ Проблем не найдено');
    } else {
      this.foundIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n🔧 ИСПРАВЛЕННЫЕ ПРОБЛЕМЫ:');
    if (this.fixedIssues.length === 0) {
      console.log('   ⚠️ Исправлений не выполнено');
    } else {
      this.fixedIssues.forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix}`);
      });
    }
    
    console.log('\n📈 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ API:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.test}: ${result.message}`);
    });
    
    console.log('\n📊 СВОДКА:');
    console.log(`   • Найдено проблем: ${report.summary.totalIssuesFound}`);
    console.log(`   • Исправлено проблем: ${report.summary.totalIssuesFixed}`);
    console.log(`   • Тестов пройдено: ${report.summary.apiTestsPassed}`);
    console.log(`   • Тестов провалено: ${report.summary.apiTestsFailed}`);
    
    console.log('\n' + '='.repeat(80));
    
    return report;
  }

  async run() {
    this.log('Запуск диагностики и исправления ошибок API...', 'info');
    
    try {
      // 1. Авторизация
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        throw new Error('Не удалось авторизоваться');
      }
      
      // 2. Проверка структуры таблиц
      await this.checkDatabaseStructure();
      
      // 3. Поиск проблем с доступом
      await this.findAccessIssues();
      
      // 4. Исправление проблем с доступом
      await this.fixAccessIssues();
      
      // 5. Тестирование API колонок
      const columnsTestResult = await this.testColumnsAPI();
      this.testResults.push({
        test: 'API колонок',
        success: columnsTestResult,
        message: columnsTestResult ? 'Работает корректно' : 'Обнаружены ошибки'
      });
      
      // 6. Тестирование API досок
      const boardsTestResult = await this.testBoardsAPI();
      this.testResults.push({
        test: 'API досок',
        success: boardsTestResult,
        message: boardsTestResult ? 'Работает корректно' : 'Обнаружены ошибки'
      });
      
      // 7. Генерация отчета
      const report = await this.generateReport();
      
      this.log('Диагностика завершена', 'success');
      return report;
      
    } catch (error) {
      this.log(`Критическая ошибка: ${error.message}`, 'error');
      throw error;
    } finally {
      // Закрываем подключение к базе данных
      if (this.pool) {
        await this.pool.end();
      }
    }
  }
}

// Запуск скрипта
if (require.main === module) {
  const fixer = new APIErrorsFixer();
  
  fixer.run()
    .then((report) => {
      console.log('\n🎉 Скрипт выполнен успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Ошибка выполнения скрипта:', error.message);
      process.exit(1);
    });
}

module.exports = APIErrorsFixer;