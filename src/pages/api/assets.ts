import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
    const runtime = context.locals.runtime;
    if (!runtime || !runtime.env || !runtime.env.DB) {
        return new Response("Database binding not found", { status: 500 });
    }

    // Verify auth
    if (!context.locals.session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const db = runtime.env.DB;
    const url = new URL(context.request.url);
    const action = url.searchParams.get("action");

    try {
        if (action === "list_types") {
            const { results } = await db.prepare("SELECT * FROM asset_types").all();
            return new Response(JSON.stringify(results), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "list_assets") {
            const typeId = url.searchParams.get("type_id");
            let query = "SELECT * FROM assets ORDER BY created_at DESC";
            let stmt = db.prepare(query);
            if (typeId) {
                query = "SELECT * FROM assets WHERE asset_type_id = ? ORDER BY created_at DESC";
                stmt = db.prepare(query).bind(typeId);
            }
            const { results } = await stmt.all();
            return new Response(JSON.stringify(results), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response("Bad Request: Invalid action", { status: 400 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const POST: APIRoute = async (context) => {
    const runtime = context.locals.runtime;
    if (!runtime || !runtime.env || !runtime.env.DB) {
        return new Response("Database binding not found", { status: 500 });
    }

    // Verify auth
    if (!context.locals.session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const db = runtime.env.DB;
    const url = new URL(context.request.url);
    const action = url.searchParams.get("action");
    const body = await context.request.json().catch(() => ({}));

    try {
        if (action === "create_type") {
            const { name, icon, description, fields } = body;
            if (!name || !fields) {
                return new Response("Missing name or fields", { status: 400 });
            }
            const id = crypto.randomUUID();
            await db.prepare(
                "INSERT INTO asset_types (id, name, icon, description, fields_json) VALUES (?, ?, ?, ?, ?)"
            ).bind(id, name, icon || "", description || "", JSON.stringify(fields)).run();

            return new Response(JSON.stringify({ id, success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "create_asset") {
            const { asset_type_id, name, values } = body;
            if (!asset_type_id || !name || !values) {
                return new Response("Missing asset_type_id, name, or values", { status: 400 });
            }
            const id = crypto.randomUUID();
            const now = Date.now();
            await db.prepare(
                "INSERT INTO assets (id, asset_type_id, name, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(id, asset_type_id, name, JSON.stringify(values), now, now).run();

            return new Response(JSON.stringify({ id, success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "update_asset") {
            const { id, values } = body;
            if (!id || !values) {
                return new Response("Missing id or values", { status: 400 });
            }
            const now = Date.now();
            await db.prepare(
                "UPDATE assets SET values_json = ?, updated_at = ? WHERE id = ?"
            ).bind(JSON.stringify(values), now, id).run();

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "delete_asset") {
            const { id } = body;
            if (!id) {
                return new Response("Missing id", { status: 400 });
            }
            await db.prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "delete_type") {
            const { id } = body;
            if (!id) {
                return new Response("Missing id", { status: 400 });
            }
            // Delete type and all related assets
            await db.prepare("DELETE FROM assets WHERE asset_type_id = ?").bind(id).run();
            await db.prepare("DELETE FROM asset_types WHERE id = ?").bind(id).run();
            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response("Bad Request: Invalid action", { status: 400 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
