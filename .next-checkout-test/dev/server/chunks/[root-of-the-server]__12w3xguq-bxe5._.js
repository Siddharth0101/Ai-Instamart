module.exports = [
"[externals]/node:crypto [external] (node:crypto, cjs, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[externals]/node:crypto [external] (node:crypto, cjs)");
    });
});
}),
"[project]/node_modules/@vercel/oidc/dist/token-util.js [app-route] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[project]/node_modules/@vercel/oidc/dist/token-util.js [app-route] (ecmascript)");
    });
});
}),
"[project]/node_modules/@vercel/oidc/dist/token.js [app-route] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/node_modules_@vercel_oidc_dist_token_1o4m7ms78h_w1.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/@vercel/oidc/dist/token.js [app-route] (ecmascript)");
    });
});
}),
];