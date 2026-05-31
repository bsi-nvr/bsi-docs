import { defineMiddleware } from "astro:middleware";
import { getAuth } from "./auth";
import { initializeD1 } from "./db";

export const onRequest = defineMiddleware(async (context, next) => {
    const runtime = context.locals.runtime;
    
    // Ensure runtime environment and database exist
    if (!runtime || !runtime.env || !runtime.env.DB) {
        // Fallback for build time or environments where D1 is not bound yet
        context.locals.user = null;
        context.locals.session = null;
        return next();
    }

    const db = runtime.env.DB;

    // Automatically initialize database schema at runtime
    await initializeD1(db);

    const baseURL = context.url.origin;
    const auth = getAuth(db, baseURL);

    // Verify session
    const sessionData = await auth.api.getSession({
        headers: context.request.headers,
    });

    if (sessionData) {
        context.locals.user = sessionData.user;
        context.locals.session = sessionData.session;
    } else {
        context.locals.user = null;
        context.locals.session = null;
    }

    const pathname = context.url.pathname;
    
    // Define paths that are public
    const isPublic = 
        pathname === "/login" || 
        pathname === "/register" || 
        pathname.startsWith("/api/auth/") ||
        pathname.startsWith("/_astro/") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.includes(".png") ||
        pathname.includes(".jpg") ||
        pathname.includes(".svg");

    // Protect all other routes
    if (!isPublic && !context.locals.session) {
        return context.redirect("/login");
    }

    // If authenticated user goes to login or register, redirect to dashboard
    if ((pathname === "/login" || pathname === "/register") && context.locals.session) {
        return context.redirect("/");
    }

    return next();
});
