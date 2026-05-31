import type { APIRoute } from "astro";
import { getAuth } from "../../../auth";

export const ALL: APIRoute = async (context) => {
    const runtime = context.locals.runtime;
    if (!runtime || !runtime.env || !runtime.env.DB) {
        return new Response("Database binding not found", { status: 500 });
    }

    const db = runtime.env.DB;
    const baseURL = context.url.origin;
    const auth = getAuth(db, baseURL);

    return auth.handler(context.request);
};
