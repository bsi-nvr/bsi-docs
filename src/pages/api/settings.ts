import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = async (context) => {
    const db = typeof env !== "undefined" ? (env as any).DB : undefined;
    if (!db) {
        return new Response("Database binding not found", { status: 500 });
    }

    if (!context.locals.session) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const row = await db.prepare("SELECT value FROM settings WHERE key = ?")
            .bind("bitwarden_vault_url")
            .get<{ value: string }>();

        const bitwarden_vault_url = row?.value || "https://vault.bitwarden.com";
        return new Response(JSON.stringify({ bitwarden_vault_url }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const POST: APIRoute = async (context) => {
    const db = typeof env !== "undefined" ? (env as any).DB : undefined;
    if (!db) {
        return new Response("Database binding not found", { status: 500 });
    }

    if (!context.locals.session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const body = await context.request.json().catch(() => ({}));
    const { bitwarden_vault_url } = body;

    if (!bitwarden_vault_url) {
        return new Response("Missing bitwarden_vault_url", { status: 400 });
    }

    try {
        await db.prepare(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
        ).bind("bitwarden_vault_url", bitwarden_vault_url).run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
