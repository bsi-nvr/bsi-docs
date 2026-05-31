import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getAuth } from "../../../auth";

export const ALL: APIRoute = async (context) => {
    const db = typeof env !== "undefined" ? (env as any).DB : undefined;
    if (!db) {
        return new Response("Database binding not found", { status: 500 });
    }

    const baseURL = context.url.origin;
    const auth = getAuth(db, baseURL);

    return auth.handler(context.request);
};
