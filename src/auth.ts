import { betterAuth } from "better-auth";

export function getAuth(db: D1Database, baseURL?: string) {
    return betterAuth({
        database: db,
        emailAndPassword: {
            enabled: true,
        },
        baseURL: baseURL || "http://localhost:4321",
        secret: "a-very-long-secret-key-at-least-32-characters-for-hudu-docs-auth",
        advanced: {
            backgroundTasks: {
                handler: (promise: Promise<any>, ctx?: any) => {
                    if (ctx && typeof ctx.waitUntil === 'function') {
                        ctx.waitUntil(promise);
                    } else {
                        promise.catch(console.error);
                    }
                }
            }
        }
    });
}
