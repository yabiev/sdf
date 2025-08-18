(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[project]/src/lib/utils.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "cn": (()=>cn),
    "formatDate": (()=>formatDate),
    "formatDateTime": (()=>formatDateTime),
    "generateId": (()=>generateId),
    "getDaysUntilDeadline": (()=>getDaysUntilDeadline),
    "getInitials": (()=>getInitials),
    "isOverdue": (()=>isOverdue)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
function formatDate(date) {
    if (!date || isNaN(date.getTime())) {
        return 'Неверная дата';
    }
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}
function formatDateTime(date) {
    if (!date || isNaN(date.getTime())) {
        return 'Неверная дата';
    }
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}
function isOverdue(date) {
    if (!date || isNaN(date.getTime())) {
        return false;
    }
    return date < new Date();
}
function getDaysUntilDeadline(date) {
    if (!date || isNaN(date.getTime())) {
        return 0;
    }
    const today = new Date();
    const deadline = new Date(date);
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
function getInitials(name) {
    return name.split(" ").map((word)=>word.charAt(0)).join("").toUpperCase().slice(0, 2);
}
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/lib/api.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// API клиент для работы с бэкендом
__turbopack_context__.s({
    "api": (()=>api)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
class ApiClient {
    baseUrl;
    csrfToken = null;
    constructor(){
        this.baseUrl = ("TURBOPACK compile-time value", "http://localhost:3000") || '';
        this.initializeCSRF();
    }
    async initializeCSRF() {
        try {
            // Get CSRF token from server
            const response = await fetch(`${this.baseUrl}/api/csrf`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                this.csrfToken = data.csrfToken;
            }
        } catch (error) {
            console.warn('Failed to initialize CSRF token:', error);
        }
    }
    getAuthToken() {
        if ("TURBOPACK compile-time falsy", 0) {
            "TURBOPACK unreachable";
        }
        // Используем только cookie для безопасности (защита от XSS)
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find((cookie)=>cookie.trim().startsWith('auth-token-client='));
        if (authCookie) {
            return authCookie.split('=')[1];
        }
        return null;
    }
    getCSRFToken() {
        if (typeof document !== 'undefined') {
            const cookies = document.cookie.split(';');
            const csrfCookie = cookies.find((cookie)=>cookie.trim().startsWith('csrf-token='));
            if (csrfCookie) {
                return csrfCookie.split('=')[1];
            }
        }
        return this.csrfToken;
    }
    setAuthToken(token) {
    // Токен устанавливается сервером через httpOnly cookie
    // Клиентская установка не требуется для безопасности
    // localStorage больше не используется для предотвращения XSS атак
    }
    removeAuthToken() {
    // Токен удаляется сервером через API logout
    // localStorage больше не используется для предотвращения XSS атак
    }
    async request(endpoint, options = {}, retries = 3) {
        const url = `${this.baseUrl}/api${endpoint}`;
        for(let attempt = 0; attempt <= retries; attempt++){
            try {
                const token = this.getAuthToken();
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                // Add CSRF token for state-changing requests
                if ([
                    'POST',
                    'PUT',
                    'DELETE',
                    'PATCH'
                ].includes(options.method?.toUpperCase() || 'GET')) {
                    const csrfToken = this.getCSRFToken();
                    if (csrfToken) {
                        headers['X-CSRF-Token'] = csrfToken;
                    }
                }
                const controller = new AbortController();
                const timeoutId = setTimeout(()=>controller.abort(), 30000); // 30s timeout
                const response = await fetch(url, {
                    headers,
                    credentials: 'include',
                    signal: controller.signal,
                    ...options
                });
                clearTimeout(timeoutId);
                // Handle different response types
                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = {
                        message: await response.text()
                    };
                }
                if (!response.ok) {
                    // Handle specific HTTP errors
                    if (response.status === 401) {
                        // Unauthorized - just return error, don't redirect
                        // The AuthModal will handle showing login form
                        return {
                            error: 'Сессия истекла. Необходимо войти в систему заново.'
                        };
                    }
                    if (response.status === 403) {
                        return {
                            error: 'Недостаточно прав для выполнения операции'
                        };
                    }
                    if (response.status === 429) {
                        // Rate limiting - wait and retry
                        if (attempt < retries) {
                            await new Promise((resolve)=>setTimeout(resolve, Math.pow(2, attempt) * 1000));
                            continue;
                        }
                        return {
                            error: 'Слишком много запросов. Попробуйте позже.'
                        };
                    }
                    if (response.status >= 500) {
                        // Server error - retry
                        if (attempt < retries) {
                            await new Promise((resolve)=>setTimeout(resolve, Math.pow(2, attempt) * 1000));
                            continue;
                        }
                        return {
                            error: 'Ошибка сервера. Попробуйте позже.'
                        };
                    }
                    return {
                        error: data.error || `HTTP ${response.status}: ${response.statusText}`
                    };
                }
                return {
                    data
                };
            } catch (error) {
                console.error(`API Error (attempt ${attempt + 1}):`, error);
                // Handle specific error types
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    if (attempt < retries) {
                        await new Promise((resolve)=>setTimeout(resolve, Math.pow(2, attempt) * 1000));
                        continue;
                    }
                    return {
                        error: 'Ошибка сети. Проверьте подключение к интернету.'
                    };
                }
                if (error instanceof Error && error.name === 'AbortError') {
                    return {
                        error: 'Запрос прерван по таймауту'
                    };
                }
                if (attempt < retries) {
                    await new Promise((resolve)=>setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    continue;
                }
                return {
                    error: 'Произошла неожиданная ошибка'
                };
            }
        }
        return {
            error: 'Максимальное количество попыток исчерпано'
        };
    }
    // Методы аутентификации
    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password
            })
        });
        // Сохраняем токен при успешном логине
        if (response.data?.token) {
            this.setAuthToken(response.data.token);
        }
        return response;
    }
    async register(name, email, password) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name,
                email,
                password
            })
        });
        // Сохраняем токен при успешной регистрации
        if (response.data?.token) {
            this.setAuthToken(response.data.token);
        }
        return response;
    }
    async logout() {
        const response = await this.request('/auth/logout', {
            method: 'POST'
        });
        // Удаляем токен при выходе
        this.removeAuthToken();
        return response;
    }
    async getCurrentUser() {
        return this.request('/auth/me');
    }
    // Методы для работы с пользователями
    async getUsers(params) {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set('status', params.status);
        if (params?.projectId) searchParams.set('projectId', params.projectId);
        if (params?.includeStats) searchParams.set('includeStats', 'true');
        const query = searchParams.toString();
        return this.request(`/users${query ? `?${query}` : ''}`);
    }
    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    async updateUser(userId, updateData) {
        return this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }
    async deleteUser(userId) {
        return this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }
    // Методы для работы с проектами
    async getProjects() {
        return this.request('/projects');
    }
    async createProject(projectData) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }
    async updateProject(projectId, updateData) {
        return this.request(`/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }
    async deleteProject(projectId) {
        return this.request(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    }
    // Методы для работы с досками
    async getBoards(projectId, params) {
        const searchParams = new URLSearchParams();
        if (projectId) searchParams.set('projectId', projectId);
        if (params?.includeArchived) searchParams.set('includeArchived', 'true');
        if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
        if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
        const query = searchParams.toString();
        return this.request(`/boards${query ? `?${query}` : ''}`);
    }
    async createBoard(boardData) {
        return this.request('/boards', {
            method: 'POST',
            body: JSON.stringify(boardData)
        });
    }
    async deleteBoard(boardId) {
        return this.request(`/boards?boardId=${boardId}`, {
            method: 'DELETE'
        });
    }
    // Методы для работы с колонками
    async getColumns(boardId, params) {
        const searchParams = new URLSearchParams();
        searchParams.set('boardId', boardId);
        if (params?.includeArchived) searchParams.set('includeArchived', 'true');
        if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
        if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
        const query = searchParams.toString();
        return this.request(`/columns?${query}`);
    }
    async createColumn(columnData) {
        return this.request('/columns', {
            method: 'POST',
            body: JSON.stringify(columnData)
        });
    }
    async updateColumnsOrder(boardId, columnOrders) {
        return this.request('/columns', {
            method: 'PUT',
            body: JSON.stringify({
                boardId,
                columnOrders
            })
        });
    }
    // Методы для работы с задачами
    async getTasks(params) {
        const searchParams = new URLSearchParams();
        if (params?.columnId) searchParams.set('columnId', params.columnId);
        if (params?.projectId) searchParams.set('projectId', params.projectId);
        if (params?.boardId) searchParams.set('boardId', params.boardId);
        if (params?.status) searchParams.set('status', params.status);
        if (params?.assigneeId) searchParams.set('assigneeId', params.assigneeId);
        if (params?.priority) searchParams.set('priority', params.priority);
        if (params?.includeArchived) searchParams.set('includeArchived', 'true');
        if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
        if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request(`/tasks${query ? `?${query}` : ''}`);
    }
    async getTask(taskId) {
        return this.request(`/tasks/${taskId}`);
    }
    async createTask(taskData) {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }
    async updateTask(taskId, updateData) {
        return this.request(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }
    async deleteTask(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }
}
const api = new ApiClient();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/lib/postgresql-adapter.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "PostgreSQLAdapter": (()=>PostgreSQLAdapter),
    "default": (()=>__TURBOPACK__default__export__),
    "getPostgreSQLAdapter": (()=>getPostgreSQLAdapter)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$pg$2f$esm$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/pg/esm/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$dist$2f$bcrypt$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/dist/bcrypt.js [app-client] (ecmascript)");
;
;
class PostgreSQLAdapter {
    static instance = null;
    pool;
    isInitialized = false;
    constructor(config){
        this.pool = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$pg$2f$esm$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Pool"]({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? {
                rejectUnauthorized: false
            } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        });
    }
    // Инициализация базы данных
    async initialize() {
        if (this.isInitialized) return;
        try {
            const client = await this.pool.connect();
            // Проверяем подключение
            await client.query('SELECT NOW()');
            console.log('✅ PostgreSQL подключение установлено');
            client.release();
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ Ошибка подключения к PostgreSQL:', error);
            throw error;
        }
    }
    // Закрытие пула соединений
    async close() {
        await this.pool.end();
        this.isInitialized = false;
    }
    // Получение клиента для транзакций
    async getClient() {
        return await this.pool.connect();
    }
    // Выполнение запроса
    async query(text, params) {
        const client = await this.pool.connect();
        try {
            console.log('SQL Query:', text);
            console.log('SQL Params:', params);
            const result = await client.query(text, params);
            return result;
        } finally{
            client.release();
        }
    }
    // === МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ===
    async createUser(email, password, name, role = 'user') {
        const hashedPassword = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$dist$2f$bcrypt$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].hash(password, 12);
        const result = await this.query(`INSERT INTO users (email, password_hash, name, role, approval_status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`, [
            email,
            hashedPassword,
            name,
            role,
            'pending'
        ]);
        return result.rows[0];
    }
    async getUserByEmail(email) {
        const result = await this.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [
            email
        ]);
        return result.rows[0] || null;
    }
    async getUserById(id) {
        const result = await this.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [
            id
        ]);
        const row = result.rows[0];
        if (!row) return null;
        // Маппинг полей базы данных в User интерфейс
        return {
            id: row.id,
            userId: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            status: row.is_active ? 'active' : 'inactive',
            approval_status: row.approval_status,
            avatar: row.avatar,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastLoginAt: row.last_login_at,
            is_active: row.is_active,
            created_at: row.created_at,
            updated_at: row.updated_at,
            last_login_at: row.last_login_at
        };
    }
    async updateUser(id, updates) {
        const fields = Object.keys(updates).filter((key)=>key !== 'id');
        const values = fields.map((field)=>updates[field]);
        const setClause = fields.map((field, index)=>`${field} = $${index + 2}`).join(', ');
        if (fields.length === 0) {
            return await this.getUserById(id);
        }
        const result = await this.query(`UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`, [
            id,
            ...values
        ]);
        return result.rows[0] || null;
    }
    async getAllUsers() {
        const result = await this.query('SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC');
        return result.rows;
    }
    async deleteUser(id) {
        const result = await this.query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [
            id
        ]);
        return result.rowCount > 0;
    }
    // === МЕТОДЫ ДЛЯ ПРОЕКТОВ ===
    async createProject(name, description, ownerId, color) {
        const result = await this.query(`INSERT INTO projects (name, description, creator_id, color)
     VALUES ($1, $2, $3, $4) RETURNING *`, [
            name,
            description,
            ownerId,
            color || '#3B82F6'
        ]);
        return result.rows[0];
    }
    async getProjectById(id) {
        const result = await this.query('SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL', [
            id
        ]);
        return result.rows[0] || null;
    }
    async getProjectsByUserId(userId) {
        const result = await this.query(`SELECT DISTINCT p.* FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id 
       WHERE (p.creator_id = $1 OR pm.user_id = $1) AND p.deleted_at IS NULL 
       ORDER BY p.created_at DESC`, [
            userId
        ]);
        return result.rows;
    }
    async getAllProjects() {
        const result = await this.query('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC');
        return result.rows;
    }
    async updateProject(id, updates) {
        const fields = Object.keys(updates).filter((key)=>key !== 'id');
        const values = fields.map((field)=>updates[field]);
        const setClause = fields.map((field, index)=>`${field} = $${index + 2}`).join(', ');
        if (fields.length === 0) {
            return await this.getProjectById(id);
        }
        const result = await this.query(`UPDATE projects SET ${setClause} WHERE id = $1 RETURNING *`, [
            id,
            ...values
        ]);
        return result.rows[0] || null;
    }
    async deleteProject(id) {
        const result = await this.query('UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [
            id
        ]);
        return result.rowCount > 0;
    }
    async hasProjectAccess(userId, projectId) {
        try {
            // Проверяем, является ли пользователь владельцем проекта
            const ownerResult = await this.query('SELECT creator_id FROM projects WHERE id = $1 AND deleted_at IS NULL', [
                projectId
            ]);
            if (ownerResult.rows.length === 0) {
                return false; // Проект не найден
            }
            const projectOwner = ownerResult.rows[0].creator_id;
            if (projectOwner === userId) {
                return true; // Пользователь является владельцем
            }
            // Проверяем членство в проекте
            const memberResult = await this.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [
                projectId,
                userId
            ]);
            return memberResult.rows.length > 0;
        } catch (error) {
            console.error('Error checking project access:', error);
            return false;
        }
    }
    // === МЕТОДЫ ДЛЯ ДОСОК ===
    async createBoard(name, description, projectId) {
        const result = await this.query(`INSERT INTO boards (name, project_id) 
       VALUES ($1, $2) 
       RETURNING *`, [
            name,
            projectId
        ]);
        return result.rows[0];
    }
    async getBoardById(id) {
        const result = await this.query('SELECT * FROM boards WHERE id = $1 AND deleted_at IS NULL', [
            id
        ]);
        return result.rows[0] || null;
    }
    async getBoardsByProjectId(projectId) {
        const result = await this.query('SELECT * FROM boards WHERE project_id = $1 AND deleted_at IS NULL ORDER BY position, created_at', [
            projectId
        ]);
        return result.rows;
    }
    async updateBoard(id, updates) {
        const fields = Object.keys(updates).filter((key)=>key !== 'id');
        const values = fields.map((field)=>updates[field]);
        const setClause = fields.map((field, index)=>`${field} = $${index + 2}`).join(', ');
        if (fields.length === 0) {
            return await this.getBoardById(id);
        }
        const result = await this.query(`UPDATE boards SET ${setClause} WHERE id = $1 RETURNING *`, [
            id,
            ...values
        ]);
        return result.rows[0] || null;
    }
    async deleteBoard(id) {
        const result = await this.query('UPDATE boards SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [
            id
        ]);
        return result.rowCount > 0;
    }
    // === МЕТОДЫ ДЛЯ КОЛОНОК ===
    async createColumn(name, boardId, position, color) {
        const result = await this.query(`INSERT INTO columns (title, board_id, position, color) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`, [
            name,
            boardId,
            position || 0,
            color || '#6B7280'
        ]);
        return result.rows[0];
    }
    async getColumnById(id) {
        const result = await this.query('SELECT * FROM columns WHERE id = $1 AND deleted_at IS NULL', [
            id
        ]);
        return result.rows[0] || null;
    }
    async getColumnsByBoardId(boardId) {
        const result = await this.query('SELECT * FROM columns WHERE board_id = $1 AND deleted_at IS NULL ORDER BY position, created_at', [
            boardId
        ]);
        return result.rows;
    }
    async updateColumn(id, updates) {
        const fields = Object.keys(updates).filter((key)=>key !== 'id');
        const values = fields.map((field)=>updates[field]);
        const setClause = fields.map((field, index)=>`${field} = $${index + 2}`).join(', ');
        if (fields.length === 0) {
            return await this.getColumnById(id);
        }
        const result = await this.query(`UPDATE columns SET ${setClause} WHERE id = $1 RETURNING *`, [
            id,
            ...values
        ]);
        return result.rows[0] || null;
    }
    async deleteColumn(id) {
        const result = await this.query('UPDATE columns SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [
            id
        ]);
        return result.rowCount > 0;
    }
    // === МЕТОДЫ ДЛЯ ЗАДАЧ ===
    async createTask(taskData) {
        const { title, description, status = 'todo', priority = 'medium', project_id, board_id, column_id, assignee_id, reporter_id, position = 0 } = taskData;
        const result = await this.query(`INSERT INTO tasks (title, description, status, priority, project_id, board_id, column_id, assignee_id, reporter_id, position) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`, [
            title,
            description,
            status,
            priority,
            project_id,
            board_id,
            column_id,
            assignee_id,
            reporter_id,
            position
        ]);
        return result.rows[0];
    }
    async getTaskById(id) {
        const result = await this.query('SELECT * FROM tasks WHERE id = $1 AND deleted_at IS NULL', [
            id
        ]);
        return result.rows[0] || null;
    }
    async getTasksByProjectId(projectId) {
        const result = await this.query('SELECT * FROM tasks WHERE project_id = $1 AND deleted_at IS NULL ORDER BY position, created_at', [
            projectId
        ]);
        return result.rows;
    }
    async getTasksByColumnId(columnId) {
        const result = await this.query('SELECT * FROM tasks WHERE column_id = $1 AND deleted_at IS NULL ORDER BY position, created_at', [
            columnId
        ]);
        return result.rows;
    }
    async updateTask(id, updates) {
        const fields = Object.keys(updates).filter((key)=>key !== 'id');
        const values = fields.map((field)=>updates[field]);
        const setClause = fields.map((field, index)=>`${field} = $${index + 2}`).join(', ');
        if (fields.length === 0) {
            return await this.getTaskById(id);
        }
        const result = await this.query(`UPDATE tasks SET ${setClause} WHERE id = $1 RETURNING *`, [
            id,
            ...values
        ]);
        return result.rows[0] || null;
    }
    async deleteTask(id) {
        const result = await this.query('UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [
            id
        ]);
        return result.rowCount > 0;
    }
    // === МЕТОДЫ ДЛЯ СЕССИЙ ===
    async createSession(sessionToken, userId, expiresAt) {
        const result = await this.query(`INSERT INTO user_sessions (session_token, user_id, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`, [
            sessionToken,
            userId,
            expiresAt
        ]);
        const row = result.rows[0];
        return {
            id: row.id,
            userId: row.user_id,
            token: row.session_token,
            expiresAt: new Date(row.expires_at),
            isActive: true,
            userAgent: row.user_agent,
            ipAddress: row.ip_address,
            lastActivityAt: new Date(row.last_activity_at || row.created_at),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at || row.created_at)
        };
    }
    async getSessionByToken(sessionToken) {
        const result = await this.query('SELECT * FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()', [
            sessionToken
        ]);
        if (!result.rows[0]) return null;
        const row = result.rows[0];
        return {
            id: row.id,
            userId: row.user_id,
            token: row.session_token,
            expiresAt: new Date(row.expires_at),
            isActive: true,
            userAgent: row.user_agent,
            ipAddress: row.ip_address,
            lastActivityAt: new Date(row.last_activity_at || row.created_at),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at || row.created_at)
        };
    }
    async deleteSession(sessionToken) {
        const result = await this.query('DELETE FROM user_sessions WHERE session_token = $1', [
            sessionToken
        ]);
        return result.rowCount > 0;
    }
    async deleteExpiredSessions() {
        const result = await this.query('DELETE FROM user_sessions WHERE expires_at <= NOW()');
        return result.rowCount;
    }
    // === МЕТОДЫ ДЛЯ КОММЕНТАРИЕВ ===
    async createComment(content, taskId, authorId) {
        const result = await this.query(`INSERT INTO comments (content, task_id, author_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`, [
            content,
            taskId,
            authorId
        ]);
        return result.rows[0];
    }
    async getCommentsByTaskId(taskId) {
        const result = await this.query('SELECT * FROM comments WHERE task_id = $1 AND deleted_at IS NULL ORDER BY created_at', [
            taskId
        ]);
        return result.rows;
    }
    async updateComment(id, content) {
        const result = await this.query('UPDATE comments SET content = $2 WHERE id = $1 RETURNING *', [
            id,
            content
        ]);
        return result.rows[0] || null;
    }
    async deleteComment(id) {
        const result = await this.query('UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [
            id
        ]);
        return result.rowCount > 0;
    }
    // === МЕТОДЫ ДЛЯ ТЕГОВ ===
    async createTag(name, color, projectId) {
        const result = await this.query(`INSERT INTO tags (name, color, project_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`, [
            name,
            color,
            projectId
        ]);
        return result.rows[0];
    }
    async getTagsByProjectId(projectId) {
        const result = await this.query('SELECT * FROM tags WHERE project_id = $1 ORDER BY name', [
            projectId
        ]);
        return result.rows;
    }
    async addTagToTask(taskId, tagId) {
        try {
            await this.query('INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)', [
                taskId,
                tagId
            ]);
            return true;
        } catch (error) {
            return false;
        }
    }
    async removeTagFromTask(taskId, tagId) {
        const result = await this.query('DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2', [
            taskId,
            tagId
        ]);
        return result.rowCount > 0;
    }
    async getTagsByTaskId(taskId) {
        const result = await this.query(`SELECT t.* FROM tags t 
       JOIN task_tags tt ON t.id = tt.tag_id 
       WHERE tt.task_id = $1`, [
            taskId
        ]);
        return result.rows;
    }
    // Статический метод для получения экземпляра (Singleton)
    static getInstance() {
        if (!PostgreSQLAdapter.instance) {
            const config = {
                host: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_HOST || 'localhost',
                port: parseInt(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_PORT || '5432'),
                database: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_NAME || 'encore_tasks',
                user: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_USER || 'postgres',
                password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_PASSWORD || 'password',
                ssl: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_SSL === 'true'
            };
            PostgreSQLAdapter.instance = new PostgreSQLAdapter(config);
        }
        return PostgreSQLAdapter.instance;
    }
}
// Экспорт экземпляра адаптера
let dbAdapter = null;
function getPostgreSQLAdapter() {
    if (!dbAdapter) {
        const config = {
            host: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_HOST || 'localhost',
            port: parseInt(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_PORT || '5432'),
            database: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_NAME || 'encore_tasks',
            user: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_USER || 'postgres',
            password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_PASSWORD || 'password',
            ssl: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.DB_SSL === 'true'
        };
        dbAdapter = new PostgreSQLAdapter(config);
    }
    return dbAdapter;
}
const __TURBOPACK__default__export__ = getPostgreSQLAdapter;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/lib/database-adapter.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// =====================================================
// АДАПТЕР ДЛЯ РАБОТЫ С БАЗАМИ ДАННЫХ (PostgreSQL)
// =====================================================
__turbopack_context__.s({
    "DatabaseAdapter": (()=>DatabaseAdapter),
    "dbAdapter": (()=>dbAdapter)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$postgresql$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/postgresql-adapter.ts [app-client] (ecmascript)");
;
class DatabaseAdapter {
    static instance;
    currentDatabase = 'postgresql';
    isInitialized = false;
    postgresqlAdapter;
    constructor(){
        this.postgresqlAdapter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$postgresql$2d$adapter$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPostgreSQLAdapter"])();
        this.currentDatabase = 'postgresql';
    }
    static getInstance() {
        if (!DatabaseAdapter.instance) {
            DatabaseAdapter.instance = new DatabaseAdapter();
        }
        return DatabaseAdapter.instance;
    }
    /**
   * Инициализация адаптера
   */ async initialize() {
        if (this.isInitialized) return;
        try {
            // Используем PostgreSQL
            await this.postgresqlAdapter.initialize();
            this.currentDatabase = 'postgresql';
            console.log('🎯 Database Adapter: Используется PostgreSQL');
            this.isInitialized = true;
            console.log('✅ Database Adapter: Инициализация завершена');
        } catch (error) {
            console.error('❌ Database Adapter: Ошибка инициализации PostgreSQL:', error);
            throw error;
        }
    }
    /**
   * Получение статуса базы данных
   */ async getDatabaseStatus() {
        const postgresql = await Promise.resolve(this.postgresqlAdapter.initialize()).then(()=>true).catch(()=>false);
        return {
            postgresql,
            current: this.currentDatabase
        };
    }
    /**
   * Получение текущей базы данных
   */ getCurrentDatabase() {
        return this.currentDatabase;
    }
    // =====================================================
    // ОПЕРАЦИИ С ПОЛЬЗОВАТЕЛЯМИ
    // =====================================================
    /**
   * Создание пользователя
   */ async createUser(userData) {
        await this.initialize();
        const { email, password, name, role = 'user' } = userData;
        return await this.postgresqlAdapter.createUser(email, password, name, role);
    }
    /**
   * Получение пользователя по ID
   */ async getUserById(id) {
        await this.initialize();
        return await this.postgresqlAdapter.getUserById(id);
    }
    /**
   * Получение пользователя по email
   */ async getUserByEmail(email) {
        await this.initialize();
        return await this.postgresqlAdapter.getUserByEmail(email);
    }
    /**
   * Получение всех пользователей
   */ async getAllUsers() {
        await this.initialize();
        return await this.postgresqlAdapter.getAllUsers();
    }
    /**
   * Обновление пользователя
   */ async updateUser(id, updates) {
        await this.initialize();
        return await this.postgresqlAdapter.updateUser(id, updates);
    }
    /**
   * Удаление пользователя
   */ async deleteUser(id) {
        await this.initialize();
        return await this.postgresqlAdapter.deleteUser(id);
    }
    // =====================================================
    // ОПЕРАЦИИ С СЕССИЯМИ
    // =====================================================
    /**
   * Создание сессии
   */ async createSession(sessionData) {
        await this.initialize();
        const { session_token, user_id, expires_at } = sessionData;
        return await this.postgresqlAdapter.createSession(session_token, user_id, new Date(expires_at));
    }
    /**
   * Получение сессии по токену
   */ async getSessionByToken(token) {
        await this.initialize();
        return await this.postgresqlAdapter.getSessionByToken(token);
    }
    /**
   * Обновление активности сессии
   */ async updateSessionActivity(token) {
        await this.initialize();
        // Для PostgreSQL можно реализовать обновление времени последней активности
        return true;
    }
    /**
   * Удаление сессии
   */ async deleteSession(token) {
        await this.initialize();
        return await this.postgresqlAdapter.deleteSession(token);
    }
    // =====================================================
    // ОПЕРАЦИИ С ПРОЕКТАМИ
    // =====================================================
    /**
   * Создание проекта
   */ async createProject(projectData) {
        await this.initialize();
        const { name, description, creator_id, color } = projectData;
        return await this.postgresqlAdapter.createProject(name, description || '', creator_id, color);
    }
    /**
   * Получение проекта по ID
   */ async getProjectById(id) {
        await this.initialize();
        return await this.postgresqlAdapter.getProjectById(id);
    }
    /**
   * Получение всех проектов
   */ async getAllProjects() {
        await this.initialize();
        // Для PostgreSQL получаем все проекты через пользователя (требует user_id)
        // Возвращаем пустой массив, так как метод требует конкретного пользователя
        return [];
    }
    /**
   * Получение проектов пользователя
   */ async getUserProjects(userId) {
        await this.initialize();
        return await this.postgresqlAdapter.getProjectsByUserId(userId);
    }
    /**
   * Получение проектов по ID создателя
   */ async getProjectsByCreatorId(creatorId) {
        await this.initialize();
        return await this.postgresqlAdapter.getProjectsByUserId(creatorId);
    }
    /**
   * Проверка доступа к проекту
   */ async hasProjectAccess(userId, projectId) {
        await this.initialize();
        return await this.postgresqlAdapter.hasProjectAccess(userId.toString(), projectId);
    }
    // =====================================================
    // ОПЕРАЦИИ С ДОСКАМИ
    // =====================================================
    /**
   * Получение досок проекта
   */ async getProjectBoards(projectId) {
        await this.initialize();
        return await this.postgresqlAdapter.getBoardsByProjectId(projectId);
    }
    // =====================================================
    // ОПЕРАЦИИ С КОЛОНКАМИ
    // =====================================================
    /**
   * Получение колонок доски
   */ async getBoardColumns(boardId) {
        await this.initialize();
        return await this.postgresqlAdapter.getColumnsByBoardId(boardId);
    }
    /**
   * Создание колонки
   */ async createColumn(columnData) {
        await this.initialize();
        const { name, board_id, position, color } = columnData;
        return await this.postgresqlAdapter.createColumn(name, board_id, position, color);
    }
    // =====================================================
    // ОПЕРАЦИИ С ЗАДАЧАМИ
    // =====================================================
    /**
   * Создание задачи
   */ async createTask(taskData) {
        await this.initialize();
        return await this.postgresqlAdapter.createTask(taskData);
    }
    /**
   * Получение задач колонки
   */ async getColumnTasks(columnId) {
        await this.initialize();
        return await this.postgresqlAdapter.getTasksByColumnId(columnId);
    }
    /**
   * Удаление задачи
   */ async deleteTask(id) {
        await this.initialize();
        return await this.postgresqlAdapter.deleteTask(id);
    }
    /**
   * Выполнение сырого SQL запроса (для совместимости с репозиториями)
   */ async query(sql, params) {
        await this.initialize();
        const result = await this.postgresqlAdapter.query(sql, params);
        return result.rows || [];
    }
}
const dbAdapter = DatabaseAdapter.getInstance();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/contexts/AppContext.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "AppProvider": (()=>AppProvider),
    "createNotification": (()=>createNotification),
    "useApp": (()=>useApp)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
// Helper function to create notifications
function createNotification(type, title, message, userId, projectId, taskId) {
    return {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateId"])(),
        type,
        title,
        message,
        taskId,
        projectId,
        userId,
        isRead: false,
        createdAt: new Date()
    };
}
const initialState = {
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    projects: [],
    boards: [],
    tasks: [],
    archivedTasks: [],
    filteredTasks: null,
    users: [],
    selectedProject: null,
    taskActions: [],
    selectedBoard: null,
    readNotifications: [],
    notifications: [],
    pendingUserNotifications: [],
    filters: {
        assignee: "",
        priority: "",
        status: "",
        deadline: ""
    },
    sortBy: "created",
    sortOrder: "desc",
    settings: {
        theme: "dark",
        language: "ru",
        compactMode: false,
        showAvatars: true,
        emailNotifications: true,
        pushNotifications: true,
        taskReminders: true,
        telegramNotifications: true,
        taskAssigned: true,
        taskCompleted: true,
        deadlineReminder: true,
        projectUpdates: true
    }
};
// Load settings from localStorage
const loadSettings = ()=>{
    if ("TURBOPACK compile-time falsy", 0) {
        "TURBOPACK unreachable";
    }
    try {
        const saved = localStorage.getItem("encore-tasks-settings");
        if (saved) {
            return {
                ...initialState.settings,
                ...JSON.parse(saved)
            };
        }
    } catch (error) {
        console.error("Failed to load settings:", error);
    }
    return initialState.settings;
};
// Save settings to localStorage
const saveSettings = (settings)=>{
    if ("TURBOPACK compile-time falsy", 0) {
        "TURBOPACK unreachable";
    }
    try {
        localStorage.setItem("encore-tasks-settings", JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings:", error);
    }
};
// Convert API types to app types
const convertApiUserToUser = (apiUser)=>({
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        role: apiUser.role,
        isApproved: apiUser.approval_status === 'approved' || apiUser.status === 'approved' || apiUser.role === 'admin',
        createdAt: new Date(apiUser.createdAt),
        avatar: apiUser.avatar
    });
const convertApiProjectToProject = (apiProject)=>({
        id: apiProject.id,
        name: apiProject.name,
        description: apiProject.description || '',
        color: apiProject.color,
        members: [],
        createdBy: apiProject.createdBy,
        createdAt: new Date(apiProject.createdAt),
        telegramChatId: undefined // Will be added later if needed
    });
const convertApiBoardToBoard = (apiBoard)=>({
        id: apiBoard.id,
        name: apiBoard.name,
        projectId: apiBoard.projectId,
        columns: [],
        createdAt: new Date(apiBoard.createdAt)
    });
const convertApiTaskToTask = (apiTask)=>({
        id: apiTask.id,
        title: apiTask.title,
        description: apiTask.description || '',
        status: apiTask.status,
        priority: apiTask.priority,
        assignee: apiTask.assignees?.[0] ? convertApiUserToUser(apiTask.assignees[0]) : undefined,
        assignees: apiTask.assignees?.map(convertApiUserToUser) || [],
        reporter: {
            id: apiTask.reporterId,
            name: apiTask.reporterName,
            email: '',
            role: 'user',
            isApproved: true,
            createdAt: new Date()
        },
        projectId: apiTask.projectId,
        boardId: apiTask.boardId,
        subtasks: [],
        deadline: apiTask.deadline ? new Date(apiTask.deadline) : undefined,
        attachments: [],
        comments: [],
        tags: apiTask.tags?.map((tag)=>tag.name) || [],
        createdAt: new Date(apiTask.createdAt),
        updatedAt: new Date(apiTask.updatedAt),
        position: apiTask.position
    });
function appReducer(state, action) {
    switch(action.type){
        case "SET_LOADING":
            return {
                ...state,
                isLoading: action.payload
            };
        case "SET_CURRENT_USER":
        case "LOGIN":
            return {
                ...state,
                currentUser: action.payload,
                isAuthenticated: true
            };
        case "LOGOUT":
            return {
                ...state,
                currentUser: null,
                isAuthenticated: false,
                projects: [],
                boards: [],
                tasks: [],
                users: [],
                selectedProject: null,
                selectedBoard: null
            };
        case "SET_USERS":
            return {
                ...state,
                users: action.payload
            };
        case "ADD_USER":
            return {
                ...state,
                users: [
                    ...state.users,
                    action.payload
                ]
            };
        case "UPDATE_USER":
            return {
                ...state,
                users: state.users.map((user)=>user.id === action.payload.id ? action.payload : user),
                currentUser: state.currentUser?.id === action.payload.id ? action.payload : state.currentUser
            };
        case "SET_PROJECTS":
            return {
                ...state,
                projects: action.payload
            };
        case "ADD_PROJECT":
            return {
                ...state,
                projects: [
                    ...state.projects,
                    action.payload
                ]
            };
        case "UPDATE_PROJECT":
            return {
                ...state,
                projects: state.projects.map((project)=>project.id === action.payload.id ? action.payload : project),
                selectedProject: state.selectedProject?.id === action.payload.id ? action.payload : state.selectedProject
            };
        case "DELETE_PROJECT":
            return {
                ...state,
                projects: state.projects.filter((project)=>project.id !== action.payload),
                selectedProject: state.selectedProject?.id === action.payload ? null : state.selectedProject
            };
        case "SELECT_PROJECT":
            return {
                ...state,
                selectedProject: action.payload
            };
        case "SET_BOARDS":
            return {
                ...state,
                boards: action.payload
            };
        case "ADD_BOARD":
            return {
                ...state,
                boards: [
                    ...state.boards,
                    action.payload
                ]
            };
        case "UPDATE_BOARD":
            return {
                ...state,
                boards: state.boards.map((board)=>board.id === action.payload.id ? action.payload : board),
                selectedBoard: state.selectedBoard?.id === action.payload.id ? action.payload : state.selectedBoard
            };
        case "DELETE_BOARD":
            return {
                ...state,
                boards: state.boards.filter((board)=>board.id !== action.payload),
                selectedBoard: state.selectedBoard?.id === action.payload ? null : state.selectedBoard
            };
        case "SELECT_BOARD":
            return {
                ...state,
                selectedBoard: action.payload
            };
        case "SET_TASKS":
            return {
                ...state,
                tasks: action.payload
            };
        case "ADD_TASK":
            return {
                ...state,
                tasks: [
                    ...state.tasks,
                    action.payload
                ]
            };
        case "UPDATE_TASK":
            return {
                ...state,
                tasks: state.tasks.map((task)=>task.id === action.payload.id ? action.payload : task)
            };
        case "DELETE_TASK":
            return {
                ...state,
                tasks: state.tasks.filter((task)=>task.id !== action.payload)
            };
        case "SET_FILTERS":
            return {
                ...state,
                filters: {
                    ...state.filters,
                    ...action.payload
                }
            };
        case "SET_SORT":
            return {
                ...state,
                sortBy: action.payload.sortBy,
                sortOrder: action.payload.sortOrder
            };
        case "SET_FILTERED_TASKS":
            return {
                ...state,
                filteredTasks: action.payload
            };
        case "CLEAR_FILTERED_TASKS":
            return {
                ...state,
                filteredTasks: null
            };
        case "ADD_NOTIFICATION":
            return {
                ...state,
                notifications: [
                    action.payload,
                    ...state.notifications
                ]
            };
        case "MARK_NOTIFICATION_READ":
            return {
                ...state,
                notifications: state.notifications.map((notification)=>notification.id === action.payload ? {
                        ...notification,
                        isRead: true
                    } : notification)
            };
        case "MARK_ALL_NOTIFICATIONS_READ":
            return {
                ...state,
                notifications: state.notifications.map((notification)=>({
                        ...notification,
                        isRead: true
                    }))
            };
        case "UPDATE_SETTINGS":
            const newSettings = {
                ...state.settings,
                ...action.payload
            };
            saveSettings(newSettings);
            return {
                ...state,
                settings: newSettings
            };
        default:
            return state;
    }
}
const AppContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function AppProvider({ children }) {
    _s();
    const [state, dispatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useReducer"])(appReducer, {
        ...initialState,
        settings: loadSettings()
    });
    // Initialize authentication on app load
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppProvider.useEffect": ()=>{
            const initializeAuth = {
                "AppProvider.useEffect.initializeAuth": async ()=>{
                    dispatch({
                        type: "SET_LOADING",
                        payload: true
                    });
                    try {
                        // Check if user is already authenticated
                        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getCurrentUser();
                        if (response.data?.user && !response.error) {
                            const user = convertApiUserToUser(response.data.user);
                            dispatch({
                                type: "LOGIN",
                                payload: user
                            });
                        // Load initial data
                        // await Promise.all([
                        //   loadProjects(),
                        //   loadUsers()
                        // ]);
                        }
                    } catch (error) {
                        console.log('No existing session found');
                    } finally{
                        dispatch({
                            type: "SET_LOADING",
                            payload: false
                        });
                    }
                }
            }["AppProvider.useEffect.initializeAuth"];
            initializeAuth();
        }
    }["AppProvider.useEffect"], []);
    // API methods
    const login = async (email, password)=>{
        dispatch({
            type: "SET_LOADING",
            payload: true
        });
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].login(email, password);
            if (response.error) {
                return false;
            }
            if (response.data?.user) {
                const user = convertApiUserToUser(response.data.user);
                dispatch({
                    type: "LOGIN",
                    payload: user
                });
                // Load initial data
                // await Promise.all([
                //   loadProjects(),
                //   loadUsers()
                // ]);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        } finally{
            dispatch({
                type: "SET_LOADING",
                payload: false
            });
        }
    };
    const logout = async ()=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally{
            dispatch({
                type: "LOGOUT"
            });
        }
    };
    const loadProjects = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[loadProjects]": async ()=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getProjects();
                if (response.error) {
                    console.error('Load projects error:', response.error);
                    return;
                }
                if (response.data?.projects) {
                    const projects = response.data.projects.map(convertApiProjectToProject);
                    dispatch({
                        type: "SET_PROJECTS",
                        payload: projects
                    });
                }
            } catch (error) {
                console.error('Failed to load projects:', error);
            }
        }
    }["AppProvider.useCallback[loadProjects]"], [
        dispatch
    ]);
    const loadBoards = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[loadBoards]": async (projectId)=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getBoards(projectId);
                if (response.error) {
                    console.error('Load boards error:', response.error);
                    return;
                }
                if (response.data?.boards) {
                    const boards = response.data.boards.map(convertApiBoardToBoard);
                    // Загружаем колонки для каждой доски
                    for (const board of boards){
                        try {
                            const columnsResponse = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getColumns(board.id.toString());
                            if (columnsResponse.data?.columns) {
                                board.columns = columnsResponse.data.columns.map({
                                    "AppProvider.useCallback[loadBoards]": (col)=>({
                                            id: col.id.toString(),
                                            name: col.name,
                                            title: col.name,
                                            color: col.color,
                                            position: col.position,
                                            tasks: [] // Tasks will be loaded separately
                                        })
                                }["AppProvider.useCallback[loadBoards]"]);
                            }
                        } catch (error) {
                            console.error(`Failed to load columns for board ${board.id}:`, error);
                        }
                    }
                    dispatch({
                        type: "SET_BOARDS",
                        payload: boards
                    });
                    // Автоматически выбираем первую доску, если нет выбранной доски или она не принадлежит текущему проекту
                    if (boards.length > 0) {
                        const currentSelectedBoard = state.selectedBoard;
                        const shouldSelectNewBoard = !currentSelectedBoard || !boards.find({
                            "AppProvider.useCallback[loadBoards]": (board)=>board.id === currentSelectedBoard.id
                        }["AppProvider.useCallback[loadBoards]"]);
                        if (shouldSelectNewBoard) {
                            dispatch({
                                type: "SELECT_BOARD",
                                payload: boards[0]
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load boards:', error);
            }
        }
    }["AppProvider.useCallback[loadBoards]"], [
        dispatch,
        state.selectedBoard
    ]);
    const loadTasks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[loadTasks]": async (params)=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getTasks(params);
                if (response.error) {
                    console.error('Load tasks error:', response.error);
                    return;
                }
                if (response.data?.tasks) {
                    const tasks = response.data.tasks.map(convertApiTaskToTask);
                    dispatch({
                        type: "SET_TASKS",
                        payload: tasks
                    });
                }
            } catch (error) {
                console.error('Failed to load tasks:', error);
            }
        }
    }["AppProvider.useCallback[loadTasks]"], [
        dispatch
    ]);
    const loadUsers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppProvider.useCallback[loadUsers]": async ()=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].getUsers();
                if (response.error) {
                    console.error('Load users error:', response.error);
                    return;
                }
                if (response.data?.users) {
                    const users = response.data.users.map(convertApiUserToUser);
                    dispatch({
                        type: "SET_USERS",
                        payload: users
                    });
                }
            } catch (error) {
                console.error('Failed to load users:', error);
            }
        }
    }["AppProvider.useCallback[loadUsers]"], [
        dispatch
    ]);
    const createProject = async (projectData)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].createProject({
                ...projectData,
                color: projectData.color || '#6366f1'
            });
            if (response.error) {
                console.error('Create project error:', response.error);
                return false;
            }
            if (response.data?.project) {
                const project = convertApiProjectToProject(response.data.project);
                dispatch({
                    type: "ADD_PROJECT",
                    payload: project
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to create project:', error);
            return false;
        }
    };
    const createBoard = async (boardData)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].createBoard({
                name: boardData.name,
                description: boardData.description,
                projectId: boardData.projectId,
                visibility: 'public',
                color: '#6366f1',
                allowComments: true,
                allowAttachments: true,
                autoArchive: false
            });
            if (response.error) {
                console.error('Create board error:', response.error);
                return false;
            }
            if (response.data?.board) {
                const board = convertApiBoardToBoard(response.data.board);
                dispatch({
                    type: "ADD_BOARD",
                    payload: board
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to create board:', error);
            return false;
        }
    };
    const createTask = async (taskData)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].createTask({
                title: taskData.title,
                description: taskData.description,
                status: taskData.status || 'todo',
                priority: taskData.priority || 'medium',
                assigneeId: taskData.assigneeId,
                columnId: taskData.columnId,
                position: taskData.position || 0,
                dueDate: taskData.dueDate,
                estimatedHours: taskData.estimatedHours,
                tags: taskData.tags || []
            });
            if (response.error) {
                console.error('Create task error:', response.error);
                return false;
            }
            if (response.data?.task) {
                const task = convertApiTaskToTask(response.data.task);
                dispatch({
                    type: "ADD_TASK",
                    payload: task
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to create task:', error);
            return false;
        }
    };
    const updateTask = async (taskId, updateData)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].updateTask(taskId, updateData);
            if (response.error) {
                console.error('Update task error:', response.error);
                return false;
            }
            if (response.data?.task) {
                const task = convertApiTaskToTask(response.data.task);
                dispatch({
                    type: "UPDATE_TASK",
                    payload: task
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to update task:', error);
            return false;
        }
    };
    const deleteTask = async (taskId)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].deleteTask(taskId);
            if (response.error) {
                console.error('Delete task error:', response.error);
                return false;
            }
            dispatch({
                type: "DELETE_TASK",
                payload: taskId
            });
            return true;
        } catch (error) {
            console.error('Failed to delete task:', error);
            return false;
        }
    };
    const deleteProject = async (projectId)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].deleteProject(projectId);
            if (response.error) {
                console.error('Delete project error:', response.error);
                return false;
            }
            dispatch({
                type: "DELETE_PROJECT",
                payload: projectId
            });
            return true;
        } catch (error) {
            console.error('Failed to delete project:', error);
            return false;
        }
    };
    const deleteBoard = async (boardId)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].deleteBoard(boardId);
            if (response.error) {
                console.error('Delete board error:', response.error);
                return false;
            }
            dispatch({
                type: "DELETE_BOARD",
                payload: boardId
            });
            return true;
        } catch (error) {
            console.error('Failed to delete board:', error);
            return false;
        }
    };
    const updateUser = async (userId, updateData)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].updateUser(userId, updateData);
            if (response.error) {
                console.error('Update user error:', response.error);
                return false;
            }
            if (response.data?.user) {
                const updatedUser = convertApiUserToUser(response.data.user);
                dispatch({
                    type: "UPDATE_USER",
                    payload: updatedUser
                });
            }
            return true;
        } catch (error) {
            console.error('Failed to update user:', error);
            return false;
        }
    };
    const deleteUser = async (userId)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].deleteUser(userId);
            if (response.error) {
                console.error('Delete user error:', response.error);
                return false;
            }
            dispatch({
                type: "REJECT_USER",
                payload: userId
            });
            return true;
        } catch (error) {
            console.error('Failed to delete user:', error);
            return false;
        }
    };
    const contextValue = {
        state,
        dispatch,
        login,
        logout,
        loadProjects,
        loadBoards,
        loadTasks,
        loadUsers,
        createProject,
        createBoard,
        createTask,
        updateTask,
        deleteTask,
        deleteProject,
        updateUser,
        deleteUser
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AppContext.Provider, {
        value: contextValue,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/AppContext.tsx",
        lineNumber: 880,
        columnNumber: 5
    }, this);
}
_s(AppProvider, "MnLx+XqRQLKyuMzzPOjpurUvoVk=");
_c = AppProvider;
function useApp() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AppContext);
    if (!context) {
        throw new Error("useApp must be used within an AppProvider");
    }
    return context;
}
_s1(useApp, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
;
var _c;
__turbopack_context__.k.register(_c, "AppProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/hooks/useConfirmation.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__),
    "useConfirmation": (()=>useConfirmation)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ConfirmationModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ConfirmationModal.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
const useConfirmation = ()=>{
    _s();
    const [isOpen, setIsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [options, setOptions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [resolvePromise, setResolvePromise] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const confirm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useConfirmation.useCallback[confirm]": (confirmationOptions)=>{
            return new Promise({
                "useConfirmation.useCallback[confirm]": (resolve)=>{
                    setOptions(confirmationOptions);
                    setResolvePromise({
                        "useConfirmation.useCallback[confirm]": ()=>resolve
                    }["useConfirmation.useCallback[confirm]"]);
                    setIsOpen(true);
                }
            }["useConfirmation.useCallback[confirm]"]);
        }
    }["useConfirmation.useCallback[confirm]"], []);
    const handleConfirm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useConfirmation.useCallback[handleConfirm]": ()=>{
            if (resolvePromise) {
                resolvePromise(true);
            }
            setIsOpen(false);
            setOptions(null);
            setResolvePromise(null);
        }
    }["useConfirmation.useCallback[handleConfirm]"], [
        resolvePromise
    ]);
    const handleCancel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useConfirmation.useCallback[handleCancel]": ()=>{
            if (resolvePromise) {
                resolvePromise(false);
            }
            setIsOpen(false);
            setOptions(null);
            setResolvePromise(null);
        }
    }["useConfirmation.useCallback[handleCancel]"], [
        resolvePromise
    ]);
    const ConfirmationComponent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useConfirmation.useCallback[ConfirmationComponent]": ()=>{
            if (!options) return null;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ConfirmationModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                isOpen: isOpen,
                onClose: handleCancel,
                onConfirm: handleConfirm,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText,
                cancelText: options.cancelText,
                type: options.type
            }, void 0, false, {
                fileName: "[project]/src/hooks/useConfirmation.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this);
        }
    }["useConfirmation.useCallback[ConfirmationComponent]"], [
        isOpen,
        options,
        handleCancel,
        handleConfirm
    ]);
    return {
        ConfirmationComponent,
        confirm
    };
};
_s(useConfirmation, "UcDWqgnvm+sXs4fEz3vuMVt9e5A=");
const __TURBOPACK__default__export__ = useConfirmation;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/services/telegram.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "TelegramService": (()=>TelegramService)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
// Use environment variable or fallback to empty string for security
const TELEGRAM_BOT_TOKEN = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
// Check if we're in a browser environment and if the token is valid
const isValidEnvironment = ()=>{
    if ("TURBOPACK compile-time falsy", 0) {
        "TURBOPACK unreachable";
    }
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'your_bot_token_here') {
        console.warn('Telegram bot token not configured. Please set NEXT_PUBLIC_TELEGRAM_BOT_TOKEN environment variable.');
        return false;
    }
    return true;
};
class TelegramService {
    static async sendMessage(message) {
        // Skip if not in valid environment
        if (!isValidEnvironment()) {
            console.warn('Telegram service not available in current environment');
            return false;
        }
        // Validate required fields
        if (!message.chat_id || !message.text) {
            console.error('Telegram message validation failed: chat_id and text are required');
            return false;
        }
        try {
            const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(message)
            });
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.description || errorText;
                } catch  {
                    errorMessage = errorText;
                }
                console.error('Telegram API error:', response.status, errorMessage);
                return false;
            }
            const result = await response.json();
            return result.ok;
        } catch (error) {
            console.error("Failed to send Telegram message:", error);
            return false;
        }
    }
    static async sendTaskNotification(task, project, action, details) {
        // Skip if not in valid environment
        if (!isValidEnvironment()) {
            return false;
        }
        if (!project.telegramChatId) {
            console.warn("No Telegram chat ID configured for project:", project.name);
            return false;
        }
        const actionEmojis = {
            created: "🆕",
            updated: "✏️",
            moved: "🔄",
            completed: "✅",
            assigned: "👤"
        };
        const priorityEmojis = {
            low: "🟢",
            medium: "🟡",
            high: "🟠",
            urgent: "🔴"
        };
        const statusEmojis = {
            todo: "📋",
            "in-progress": "⚡",
            review: "👀",
            done: "✅",
            archived: "📦"
        };
        let messageText = `${actionEmojis[action]} <b>Задача ${action === "created" ? "создана" : action === "updated" ? "обновлена" : action === "moved" ? "перемещена" : action === "completed" ? "завершена" : "назначена"}</b>\n\n`;
        messageText += `📝 <b>${task.title}</b>\n`;
        if (task.description) {
            messageText += `📄 ${task.description.substring(0, 100)}${task.description.length > 100 ? "..." : ""}\n`;
        }
        messageText += `${priorityEmojis[task.priority]} Приоритет: ${task.priority === "low" ? "Низкий" : task.priority === "medium" ? "Средний" : task.priority === "high" ? "Высокий" : "Срочный"}\n`;
        messageText += `${statusEmojis[task.status]} Статус: ${task.status === "todo" ? "К выполнению" : task.status === "in-progress" ? "В работе" : "Выполнено"}\n`;
        const assignees = task.assignees || (task.assignee ? [
            task.assignee
        ] : []);
        if (assignees.length > 0) {
            if (assignees.length === 1) {
                messageText += `👤 Исполнитель: ${assignees[0].name}\n`;
            } else {
                messageText += `👥 Исполнители: ${assignees.map((a)=>a.name).join(", ")}\n`;
            }
        }
        if (task.deadline) {
            const deadline = new Date(task.deadline);
            messageText += `⏰ Дедлайн: ${deadline.toLocaleDateString("ru-RU")}\n`;
        }
        messageText += `🏷️ Проект: ${project.name}\n`;
        if (details) {
            messageText += `\n💬 ${details}`;
        }
        const message = {
            chat_id: project.telegramChatId,
            text: messageText,
            parse_mode: "HTML"
        };
        if (project.telegramTopicId) {
            message.message_thread_id = project.telegramTopicId;
        }
        return await this.sendMessage(message);
    }
    static async sendProjectNotification(project, message, type = "info") {
        if (!project.telegramChatId) {
            return false;
        }
        const typeEmojis = {
            info: "ℹ️",
            warning: "⚠️",
            error: "❌"
        };
        const messageText = `${typeEmojis[type]} <b>Проект: ${project.name}</b>\n\n${message}`;
        const telegramMessage = {
            chat_id: project.telegramChatId,
            text: messageText,
            parse_mode: "HTML"
        };
        if (project.telegramTopicId) {
            telegramMessage.message_thread_id = project.telegramTopicId;
        }
        return await this.sendMessage(telegramMessage);
    }
    static async sendDailyReport(project, tasks) {
        if (!project.telegramChatId) {
            return false;
        }
        const today = new Date();
        const todayTasks = tasks.filter((task)=>{
            const taskDate = new Date(task.createdAt);
            return taskDate.toDateString() === today.toDateString();
        });
        const completedTasks = tasks.filter((task)=>task.status === "done");
        const inProgressTasks = tasks.filter((task)=>task.status === "in-progress");
        const overdueTasks = tasks.filter((task)=>{
            if (!task.deadline) return false;
            return new Date(task.deadline) < today && task.status !== "done";
        });
        let messageText = `📊 <b>Ежедневный отчет - ${today.toLocaleDateString("ru-RU")}</b>\n`;
        messageText += `🏷️ Проект: ${project.name}\n\n`;
        messageText += `📈 <b>Статистика:</b>\n`;
        messageText += `• Всего задач: ${tasks.length}\n`;
        messageText += `• Создано сегодня: ${todayTasks.length}\n`;
        messageText += `• Выполнено: ${completedTasks.length}\n`;
        messageText += `• В работе: ${inProgressTasks.length}\n`;
        messageText += `• Просрочено: ${overdueTasks.length}\n\n`;
        if (overdueTasks.length > 0) {
            messageText += `⚠️ <b>Просроченные задачи:</b>\n`;
            overdueTasks.slice(0, 5).forEach((task)=>{
                const assignees = task.assignees || (task.assignee ? [
                    task.assignee
                ] : []);
                const assigneeText = assignees.length > 0 ? assignees.map((a)=>a.name).join(", ") : "Не назначено";
                messageText += `• ${task.title} (${assigneeText})\n`;
            });
            if (overdueTasks.length > 5) {
                messageText += `• ... и еще ${overdueTasks.length - 5} задач\n`;
            }
        }
        const message = {
            chat_id: project.telegramChatId,
            text: messageText,
            parse_mode: "HTML"
        };
        if (project.telegramTopicId) {
            message.message_thread_id = project.telegramTopicId;
        }
        return await this.sendMessage(message);
    }
    static async testConnection(chatId, topicId) {
        const message = {
            chat_id: chatId,
            text: "🤖 Тестовое сообщение от ENCORE | TASKS\n\nИнтеграция с Telegram настроена успешно!",
            parse_mode: "HTML"
        };
        if (topicId) {
            message.message_thread_id = topicId;
        }
        return await this.sendMessage(message);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/utils/taskLogger.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "createTaskAction": (()=>createTaskAction),
    "logTaskAssigned": (()=>logTaskAssigned),
    "logTaskAssigneesChanged": (()=>logTaskAssigneesChanged),
    "logTaskCreated": (()=>logTaskCreated),
    "logTaskDeleted": (()=>logTaskDeleted),
    "logTaskMoved": (()=>logTaskMoved),
    "logTaskPriorityChanged": (()=>logTaskPriorityChanged),
    "logTaskStatusChanged": (()=>logTaskStatusChanged),
    "logTaskUnassigned": (()=>logTaskUnassigned),
    "logTaskUpdated": (()=>logTaskUpdated)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2f$esm$2d$browser$2f$v4$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist/esm-browser/v4.js [app-client] (ecmascript) <export default as v4>");
;
const createTaskAction = (taskId, boardId, projectId, userId, userName, action, description, oldValue, newValue, changes)=>{
    return {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2f$esm$2d$browser$2f$v4$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])(),
        taskId,
        boardId,
        projectId,
        userId,
        userName,
        action,
        description,
        timestamp: new Date().toISOString(),
        oldValue,
        newValue,
        changes
    };
};
const logTaskCreated = (dispatch, taskId, boardId, projectId, taskTitle, userId, userName)=>{
    const action = createTaskAction(taskId, boardId, projectId, userId, userName, 'created', `Создана задача "${taskTitle}"`);
    dispatch({
        type: 'ADD_TASK_ACTION',
        payload: action
    });
};
const logTaskDeleted = (dispatch, taskId, boardId, projectId, taskTitle, userId, userName)=>{
    const action = createTaskAction(taskId, boardId, projectId, userId, userName, 'deleted', `Удалена задача "${taskTitle}"`);
    dispatch({
        type: 'ADD_TASK_ACTION',
        payload: action
    });
};
const logTaskMoved = (dispatch, taskId, boardId, projectId, taskTitle, userId, userName, fromColumn, toColumn)=>{
    const action = createTaskAction(taskId, boardId, projectId, userId, userName, 'moved', `Перемещена задача "${taskTitle}" из "${fromColumn}" в "${toColumn}"`, fromColumn, toColumn);
    dispatch({
        type: 'ADD_TASK_ACTION',
        payload: action
    });
};
const logTaskAssigned = (dispatch, taskId, boardId, projectId, taskTitle, userId, userName, assigneeName)=>{
    const action = createTaskAction(taskId, boardId, projectId, userId, userName, 'assigned', `Назначен исполнитель "${assigneeName}" для задачи "${taskTitle}"`);
    dispatch({
        type: 'ADD_TASK_ACTION',
        payload: action
    });
};
const logTaskAssigneesChanged = (dispatch, taskId, boardId, projectId, taskTitle, userId, userName, oldAssignees, newAssignees)=>{
    const added = newAssignees.filter((name)=>!oldAssignees.includes(name));
    const removed = oldAssignees.filter((name)=>!newAssignees.includes(name));
    let description = `Изменены исполнители задачи "${taskTitle}"`;
    if (added.length > 0) {
        description += `. Добавлены: ${added.join(', ')}`;
    }
    if (removed.length > 0) {
        description += `. Удалены: ${removed.join(', ')}`;
    }
    const action = createTaskAction(taskId, boardId, projectId, userId, userName, 'assigned', description, oldAssignees.join(', '), newAssignees.join(', '));
    dispatch({
        type: 'ADD_TASK_ACTION',
        payload: action
    });
};
const logTaskUnassigned = (dispatch, taskId, boardId, projectId, taskTitle, userId, userName, assigneeName)=>{
    const action = createTaskAction(taskId, boardId, projectId, userId, userName, 'unassigned', `Снят исполнитель "${assigneeName}" с задачи "${taskTitle}"`);
    dispatch({
        type: 'ADD_TASK_ACTION',
        payload: action
    });
};
const logTaskStatusChanged = (dispatch, taskId, boardId, projectId, taskTitle, userId, userName, oldStatus, newStatus)=>{
    const action = createTaskAction(taskId, boardId, projectId, userId, userName, 'status_changed', `Изменен статус задачи "${taskTitle}" с "${oldStatus}" на "${newStatus}"`, oldStatus, newStatus);
    dispatch({
        type: 'ADD_TASK_ACTION',
        payload: action
    });
};
const logTaskPriorityChanged = (dispatch, taskId, boardId, projectId, taskTitle, userId, userName, oldPriority, newPriority)=>{
    const action = createTaskAction(taskId, boardId, projectId, userId, userName, 'priority_changed', `Изменен приоритет задачи "${taskTitle}" с "${oldPriority}" на "${newPriority}"`, oldPriority, newPriority);
    dispatch({
        type: 'ADD_TASK_ACTION',
        payload: action
    });
};
const logTaskUpdated = (dispatch, taskId, boardId, projectId, taskTitle, userId, userName, changes)=>{
    const changeDescriptions = changes?.map((change)=>{
        const fieldNames = {
            title: 'название',
            description: 'описание',
            priority: 'приоритет',
            assignees: 'исполнители',
            deadline: 'срок выполнения',
            tags: 'теги'
        };
        return `${fieldNames[change.field] || change.field}: "${change.oldValue}" → "${change.newValue}"`;
    }) || [];
    const action = createTaskAction(taskId, boardId, projectId, userId, userName, 'updated', `Обновлена задача "${taskTitle}": ${changeDescriptions.join(', ')}`, undefined, undefined, changes);
    dispatch({
        type: 'ADD_TASK_ACTION',
        payload: action
    });
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/src/app/page.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>Page)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$AppContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/AppContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Layout$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/Layout.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$KanbanBoard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/KanbanBoard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$notifications$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/notifications/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$notifications$2f$NotificationSystem$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/notifications/NotificationSystem.tsx [app-client] (ecmascript)");
"use client";
;
;
;
;
;
function Page() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$AppContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AppProvider"], {
        "data-oid": "ih2_dzp",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$notifications$2f$NotificationSystem$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["NotificationProvider"], {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$Layout$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Layout"], {
                "data-oid": "zy0y3-c",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$KanbanBoard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["KanbanBoard"], {
                    "data-oid": ":_ayqqp"
                }, void 0, false, {
                    fileName: "[project]/src/app/page.tsx",
                    lineNumber: 13,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 12,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 11,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, this);
}
_c = Page;
var _c;
__turbopack_context__.k.register(_c, "Page");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=src_534f112a._.js.map