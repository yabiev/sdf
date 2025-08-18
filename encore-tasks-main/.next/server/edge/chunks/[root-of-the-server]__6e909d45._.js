(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["chunks/[root-of-the-server]__6e909d45._.js", {

"[externals]/node:buffer [external] (node:buffer, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}}),
"[project]/src/lib [middleware-edge] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
__turbopack_context__.n(__import_unsupported(`crypto`));
}}),
"[project]/src/lib/csrf.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
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
            const nodeCrypto = __turbopack_context__.r("[project]/src/lib [middleware-edge] (ecmascript)");
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
"[project]/middleware.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "config": (()=>config),
    "middleware": (()=>middleware)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$csrf$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/csrf.ts [middleware-edge] (ecmascript)");
;
;
function middleware(request) {
    const { pathname } = request.nextUrl;
    // CSRF Protection for API routes (except GET, HEAD, OPTIONS and CSRF endpoint)
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/csrf')) {
        if (![
            'GET',
            'HEAD',
            'OPTIONS'
        ].includes(request.method)) {
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$csrf$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["verifyCSRFToken"])(request)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'CSRF token validation failed'
                }, {
                    status: 403
                });
            }
        }
    }
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Content Security Policy
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'"
    ].join('; ');
    response.headers.set('Content-Security-Policy', csp);
    // Cache control for different types of requests
    // API routes - no cache for dynamic content
    if (pathname.startsWith('/api/')) {
        if (pathname.includes('/auth/') || pathname.includes('/users/') || pathname.includes('/tasks/')) {
            // Dynamic content - no cache
            response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            response.headers.set('Pragma', 'no-cache');
            response.headers.set('Expires', '0');
        } else {
            // Semi-static content - short cache
            response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
        }
    }
    // Static assets - long cache
    if (pathname.startsWith('/_next/static/') || pathname.startsWith('/favicon.ico') || pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // HTML pages - short cache with revalidation
    if (pathname === '/' || !pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
        response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }
    return response;
}
const config = {
    matcher: [
        /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */ '/((?!_next/static|_next/image|favicon.ico).*)'
    ]
};
}}),
}]);

//# sourceMappingURL=%5Broot-of-the-server%5D__6e909d45._.js.map