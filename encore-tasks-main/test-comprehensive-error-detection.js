const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Конфигурация тестирования
const CONFIG = {
    baseURL: 'http://localhost:3000',
    timeout: 10000,
    testUser: {
        email: 'admin@example.com',
        password: 'admin123'
    },
    testData: {
        validProject: {
            name: 'Test Project Valid',
            description: 'Valid test project description'
        },
        invalidProject: {
            name: '', // Пустое имя
            description: 'Invalid project with empty name'
        },
        validBoard: {
            name: 'Test Board',
            description: 'Test board description'
        },
        validTask: {
            title: 'Test Task',
            description: 'Test task description',
            status: 'todo'
        }
    }
};

class ComprehensiveErrorDetector {
    constructor() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: [],
            warnings: [],
            details: []
        };
        this.authToken = null;
        this.testProjectId = null;
        this.testBoardId = null;
        this.testTaskId = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
        console.log(logMessage);
        
        if (type === 'error') {
            this.results.errors.push(message);
        } else if (type === 'warning') {
            this.results.warnings.push(message);
        }
    }

    async makeRequest(endpoint, method, data = null, headers = {}) {
        try {
            const config = {
                method,
                url: `${CONFIG.baseURL}${endpoint}`,
                timeout: CONFIG.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (this.authToken) {
                config.headers.Authorization = `Bearer ${this.authToken}`;
            }

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return {
                success: true,
                data: response.data,
                status: response.status,
                headers: response.headers
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            };
        }
    }

    async testAuthentication() {
        this.log('🔐 Тестирование аутентификации...');
        
        // Тест 1: Валидная аутентификация
        const validAuth = await this.makeRequest('/api/auth/login', 'POST', CONFIG.testUser);
        
        if (validAuth.success && validAuth.data?.token) {
            this.authToken = validAuth.data.token;
            this.log('✅ Валидная аутентификация прошла успешно');
            this.results.passed++;
        } else {
            this.log('❌ Валидная аутентификация не удалась', 'error');
            this.results.failed++;
        }
        this.results.total++;

        // Тест 2: Невалидная аутентификация
        const invalidAuth = await this.makeRequest('/api/auth/login', 'POST', {
            email: 'invalid@example.com',
            password: 'wrongpassword'
        });
        
        if (!invalidAuth.success && invalidAuth.status === 401) {
            this.log('✅ Невалидная аутентификация корректно отклонена');
            this.results.passed++;
        } else {
            this.log('❌ Невалидная аутентификация не была отклонена', 'error');
            this.results.failed++;
        }
        this.results.total++;

        // Тест 3: Пустые данные
        const emptyAuth = await this.makeRequest('/api/auth/login', 'POST', {});
        
        if (!emptyAuth.success && (emptyAuth.status === 400 || emptyAuth.status === 422)) {
            this.log('✅ Пустые данные аутентификации корректно отклонены');
            this.results.passed++;
        } else {
            this.log('❌ Пустые данные аутентификации не были отклонены', 'error');
            this.results.failed++;
        }
        this.results.total++;
    }

    async testProjectsAPI() {
        this.log('📁 Тестирование API проектов...');
        
        if (!this.authToken) {
            this.log('❌ Нет токена аутентификации для тестирования проектов', 'error');
            return;
        }

        // Тест 1: Получение списка проектов
        const getProjects = await this.makeRequest('/api/projects', 'GET');
        
        if (getProjects.success) {
            this.log('✅ Получение списка проектов успешно');
            this.results.passed++;
            
            // Проверка формата ответа
            if (getProjects.success && getProjects.data && getProjects.data.data && Array.isArray(getProjects.data.data.projects)) {
                this.log('✅ Формат списка проектов корректный');
                this.results.passed++;
            } else {
                this.log('❌ Неверный формат списка проектов', 'error');
                this.log(`Получен формат: ${JSON.stringify(getProjects, null, 2)}`, 'debug');
                this.results.failed++;
            }
        } else {
            this.log('❌ Не удалось получить список проектов', 'error');
            this.results.failed++;
        }
        this.results.total += 2;

        // Тест 2: Создание валидного проекта
        const createProject = await this.makeRequest('/api/projects', 'POST', CONFIG.testData.validProject);
        
        if (createProject.status === 201 && createProject.data?.data?.id) {
            this.testProjectId = createProject.data.data.id;
            this.log('✅ Создание валидного проекта успешно');
            this.results.passed++;
        } else {
            this.log('❌ Не удалось создать валидный проект', 'error');
            this.log(`Статус: ${createProject.status}`, 'debug');
            this.log(`Ошибка: ${createProject.error}`, 'debug');
            this.log(`Данные ответа: ${JSON.stringify(createProject.data, null, 2)}`, 'debug');
            this.results.failed++;
        }
        this.results.total++;

        // Тест 3: Создание невалидного проекта
        const createInvalidProject = await this.makeRequest('/api/projects', 'POST', CONFIG.testData.invalidProject);
        
        if (!createInvalidProject.success && (createInvalidProject.status === 400 || createInvalidProject.status === 422)) {
            this.log('✅ Невалидный проект корректно отклонен');
            this.results.passed++;
        } else {
            this.log('❌ Невалидный проект не был отклонен', 'error');
            this.results.failed++;
        }
        this.results.total++;

        // Тест 4: Получение конкретного проекта
        if (this.testProjectId) {
            this.log(`DEBUG: Запрос проекта с ID: ${this.testProjectId}`, 'debug');
            const getProject = await this.makeRequest(`/api/projects/${this.testProjectId}`, 'GET');
            this.log(`DEBUG: Ответ получения проекта: ${JSON.stringify(getProject, null, 2)}`, 'debug');
            
            if (getProject.success && getProject.data?.data?.project?.id === this.testProjectId) {
                this.log('✅ Получение конкретного проекта успешно');
                this.results.passed++;
            } else {
                this.log('❌ Не удалось получить конкретный проект', 'error');
                this.log(`Ошибка: ${getProject.error || 'Неизвестная ошибка'}`, 'error');
                this.results.failed++;
            }
            this.results.total++;
        }
    }

    async testBoardsAPI() {
        this.log('📋 Тестирование API досок...');
        
        if (!this.authToken || !this.testProjectId) {
            this.log('❌ Нет необходимых данных для тестирования досок', 'error');
            return;
        }

        // Тест 1: Создание доски
        const boardData = {
            ...CONFIG.testData.validBoard,
            project_id: this.testProjectId
        };
        
        this.log(`DEBUG: Создание доски с данными: ${JSON.stringify(boardData, null, 2)}`, 'debug');
        this.log(`DEBUG: Project ID type: ${typeof this.testProjectId}, Value: ${this.testProjectId}`, 'debug');
        const createBoard = await this.makeRequest('/api/boards', 'POST', boardData);
        this.log(`DEBUG: Ответ создания доски: ${JSON.stringify(createBoard, null, 2)}`, 'debug');
        
        if (createBoard.success && createBoard.data?.data?.id) {
            this.testBoardId = createBoard.data.data.id;
            this.log('✅ Создание доски успешно');
            this.results.passed++;
        } else {
            this.log('❌ Не удалось создать доску', 'error');
            this.log(`Ошибка: ${createBoard.error || 'Неизвестная ошибка'}`, 'error');
            this.results.failed++;
        }
        this.results.total++;

        // Тест 2: Получение досок проекта
        this.log(`DEBUG: Запрос досок для проекта ID: ${this.testProjectId}`, 'debug');
        const getBoards = await this.makeRequest(`/api/boards?project_id=${this.testProjectId}`, 'GET');
        this.log(`DEBUG: Ответ получения досок: ${JSON.stringify(getBoards, null, 2)}`, 'debug');
        
        if (getBoards.success && Array.isArray(getBoards.data?.data?.boards)) {
            this.log('✅ Получение досок проекта успешно');
            this.results.passed++;
        } else {
            this.log('❌ Не удалось получить доски проекта', 'error');
            this.log(`Ошибка: ${getBoards.error || 'Неизвестная ошибка'}`, 'error');
            this.results.failed++;
        }
        this.results.total++;
    }

    async testTasksAPI() {
        this.log('📝 Тестирование API задач...');
        
        if (!this.authToken || !this.testBoardId) {
            this.log('❌ Нет необходимых данных для тестирования задач', 'error');
            return;
        }

        // Сначала создаем колонку в доске
        const columnData = {
            name: 'Test Column',
            board_id: this.testBoardId // Используем числовой ID доски
        };
        
        this.log(`DEBUG: Создание колонки с данными: ${JSON.stringify(columnData, null, 2)}`, 'debug');
        const createColumn = await this.makeRequest('/api/columns', 'POST', columnData);
        this.log(`DEBUG: Ответ создания колонки: ${JSON.stringify(createColumn, null, 2)}`, 'debug');
        
        if (!createColumn.success || !createColumn.data?.data?.id) {
            this.log('❌ Не удалось создать колонку для задач', 'error');
            this.log(`Ошибка: ${createColumn.error || 'Неизвестная ошибка'}`, 'error');
            this.results.failed++;
            this.results.total++;
            return;
        }
        
        this.testColumnId = createColumn.data.data.id;
        this.log('✅ Создание колонки успешно');
        this.results.passed++;
        this.results.total++;

        // Тест 1: Создание задачи
        const taskData = {
            ...CONFIG.testData.validTask,
            column_id: this.testColumnId
        };
        
        const createTask = await this.makeRequest('/api/tasks', 'POST', taskData);
        
        if (createTask.success && createTask.data?.data?.id) {
            this.testTaskId = createTask.data.data.id;
            this.log('✅ Создание задачи успешно');
            this.results.passed++;
        } else {
            this.log('❌ Не удалось создать задачу', 'error');
            this.results.failed++;
        }
        this.results.total++;

        // Тест 2: Получение задач доски
        const getTasks = await this.makeRequest(`/api/tasks?board_id=${this.testBoardId}`, 'GET');
        
        if (getTasks.success && Array.isArray(getTasks.data?.data)) {
            this.log('✅ Получение задач доски успешно');
            this.results.passed++;
        } else {
            this.log('❌ Не удалось получить задачи доски', 'error');
            this.results.failed++;
        }
        this.results.total++;

        // Тест 3: Обновление статуса задачи
        if (this.testTaskId) {
            const updateTask = await this.makeRequest(`/api/tasks/${this.testTaskId}`, 'PUT', {
                status: 'in_progress'
            });
            
            if (updateTask.success) {
                this.log('✅ Обновление статуса задачи успешно');
                this.results.passed++;
            } else {
                this.log('❌ Не удалось обновить статус задачи', 'error');
                this.results.failed++;
            }
            this.results.total++;
        }
    }

    async testErrorHandling() {
        this.log('⚠️ Тестирование обработки ошибок...');
        
        // Тест 1: Несуществующий эндпоинт
        const notFound = await this.makeRequest('/api/nonexistent', 'GET');
        
        if (!notFound.success && notFound.status === 404) {
            this.log('✅ 404 ошибка корректно обработана');
            this.results.passed++;
        } else {
            this.log('❌ 404 ошибка не обработана корректно', 'error');
            this.results.failed++;
        }
        this.results.total++;

        // Тест 2: Неавторизованный доступ
        const oldToken = this.authToken;
        this.authToken = 'invalid_token';
        
        const unauthorized = await this.makeRequest('/api/projects', 'GET');
        
        if (!unauthorized.success && unauthorized.status === 401) {
            this.log('✅ 401 ошибка корректно обработана');
            this.results.passed++;
        } else {
            this.log('❌ 401 ошибка не обработана корректно', 'error');
            this.results.failed++;
        }
        this.results.total++;
        
        this.authToken = oldToken;

        // Тест 3: Некорректные данные
        const badRequest = await this.makeRequest('/api/projects', 'POST', {
            invalidField: 'invalid_value'
        });
        
        if (!badRequest.success && (badRequest.status === 400 || badRequest.status === 422)) {
            this.log('✅ Некорректные данные корректно отклонены');
            this.results.passed++;
        } else {
            this.log('❌ Некорректные данные не были отклонены', 'error');
            this.results.failed++;
        }
        this.results.total++;
    }

    async cleanup() {
        this.log('🧹 Очистка тестовых данных...');
        
        // Удаление тестовой задачи
        if (this.testTaskId) {
            await this.makeRequest(`/api/tasks/${this.testTaskId}`, 'DELETE');
        }
        
        // Удаление тестовой колонки
        if (this.testColumnId) {
            await this.makeRequest(`/api/columns/${this.testColumnId}`, 'DELETE');
        }
        
        // Удаление тестовой доски
        if (this.testBoardId) {
            await this.makeRequest(`/api/boards/${this.testBoardId}`, 'DELETE');
        }
        
        // Удаление тестового проекта
        if (this.testProjectId) {
            await this.makeRequest(`/api/projects/${this.testProjectId}`, 'DELETE');
        }
        
        this.log('✅ Очистка завершена');
    }

    generateReport() {
        const report = {
            summary: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: this.results.total > 0 ? ((this.results.passed / this.results.total) * 100).toFixed(2) : 0
            },
            errors: this.results.errors,
            warnings: this.results.warnings,
            recommendations: []
        };

        // Генерация рекомендаций на основе найденных ошибок
        if (this.results.errors.length > 0) {
            report.recommendations.push('Исправить найденные ошибки API');
        }
        
        if (this.results.warnings.length > 0) {
            report.recommendations.push('Обратить внимание на предупреждения');
        }
        
        if (report.summary.successRate < 90) {
            report.recommendations.push('Улучшить стабильность API (успешность < 90%)');
        }

        return report;
    }

    async run() {
        this.log('🚀 Запуск комплексного тестирования...');
        
        try {
            await this.testAuthentication();
            await this.testProjectsAPI();
            await this.testBoardsAPI();
            await this.testTasksAPI();
            await this.testErrorHandling();
            
            await this.cleanup();
            
            const report = this.generateReport();
            
            this.log('📊 ИТОГОВЫЙ ОТЧЕТ:');
            this.log(`Всего тестов: ${report.summary.total}`);
            this.log(`Прошло: ${report.summary.passed}`);
            this.log(`Не прошло: ${report.summary.failed}`);
            this.log(`Успешность: ${report.summary.successRate}%`);
            
            if (report.errors.length > 0) {
                this.log('\n❌ НАЙДЕННЫЕ ОШИБКИ:');
                report.errors.forEach((error, index) => {
                    this.log(`${index + 1}. ${error}`);
                });
            }
            
            if (report.warnings.length > 0) {
                this.log('\n⚠️ ПРЕДУПРЕЖДЕНИЯ:');
                report.warnings.forEach((warning, index) => {
                    this.log(`${index + 1}. ${warning}`);
                });
            }
            
            if (report.recommendations.length > 0) {
                this.log('\n💡 РЕКОМЕНДАЦИИ:');
                report.recommendations.forEach((rec, index) => {
                    this.log(`${index + 1}. ${rec}`);
                });
            }
            
            // Сохранение отчета в файл
            const reportPath = path.join(__dirname, 'test-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            this.log(`\n📄 Детальный отчет сохранен в: ${reportPath}`);
            
            return report;
            
        } catch (error) {
            this.log(`❌ Критическая ошибка тестирования: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Запуск тестирования
if (require.main === module) {
    const detector = new ComprehensiveErrorDetector();
    detector.run()
        .then((report) => {
            if (report.summary.failed > 0) {
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('Тестирование завершилось с ошибкой:', error);
            process.exit(1);
        });
}

module.exports = ComprehensiveErrorDetector;