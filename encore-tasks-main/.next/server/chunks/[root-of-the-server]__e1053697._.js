module.exports = {

"[project]/.next-internal/server/app/api/csrf/route/actions.js [app-rsc] (server actions loader, ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
}}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/crypto [external] (crypto, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}}),
"[project]/src/lib/csrf.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "CSRF_COOKIE_NAME": (()=>CSRF_COOKIE_NAME),
    "CSRF_HEADER_NAME": (()=>CSRF_HEADER_NAME),
    "generateCSRFToken": (()=>generateCSRFToken),
    "getCSRFCookieOptions": (()=>getCSRFCookieOptions),
    "getCSRFTokenFromRequest": (()=>getCSRFTokenFromRequest),
    "verifyCSRFToken": (()=>verifyCSRFToken)
});
// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';
function generateCSRFToken() {
    // Check if we're in Node.js environment
    if ("TURBOPACK compile-time truthy", 1) {
        try {
            const nodeCrypto = __turbopack_context__.r("[externals]/crypto [external] (crypto, cjs)");
            if (nodeCrypto && typeof nodeCrypto.randomBytes === 'function') {
                return nodeCrypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
            }
        } catch (e) {
        // Fall through to Web Crypto API
        }
    }
    // Use Web Crypto API (browser/edge runtime)
    const array = new Uint8Array(CSRF_TOKEN_LENGTH);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array, (byte)=>byte.toString(16).padStart(2, '0')).join('');
}
function verifyCSRFToken(request) {
    // Skip CSRF check for GET, HEAD, OPTIONS requests
    if ([
        'GET',
        'HEAD',
        'OPTIONS'
    ].includes(request.method)) {
        return true;
    }
    // Get token from header
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    // Get token from cookie
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    // Both tokens must exist and match
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        return false;
    }
    return true;
}
function getCSRFCookieOptions() {
    return {
        name: CSRF_COOKIE_NAME,
        httpOnly: false,
        secure: ("TURBOPACK compile-time value", "development") === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24
    };
}
function getCSRFTokenFromRequest(request) {
    return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}
;
}}),
"[project]/src/app/api/csrf/route.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "GET": (()=>GET)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/csrf.ts [app-route] (ecmascript)");
;
;
async function GET(request) {
    try {
        // Generate new CSRF token
        const csrfToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateCSRFToken"])();
        // Create response with token
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            csrfToken
        });
        // Set CSRF token cookie
        const cookieOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$csrf$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCSRFCookieOptions"])();
        response.cookies.set(cookieOptions.name, csrfToken, {
            httpOnly: cookieOptions.httpOnly,
            secure: cookieOptions.secure,
            sameSite: cookieOptions.sameSite,
            path: cookieOptions.path,
            maxAge: cookieOptions.maxAge
        });
        // Set cache headers to prevent caching
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
    } catch (error) {
        console.error('Error generating CSRF token:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Внутренняя ошибка сервера'
        }, {
            status: 500
        });
    }
}
}}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__e1053697._.js.map