import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
    const runtime = context.locals.runtime;
    if (!runtime || !runtime.env || !runtime.env.DB) {
        return new Response("Database binding not found", { status: 500 });
    }

    if (!context.locals.session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const db = runtime.env.DB;
    const url = new URL(context.request.url);
    const action = url.searchParams.get("action");

    try {
        if (action === "list_templates") {
            const { results } = await db.prepare("SELECT * FROM checklist_templates ORDER BY created_at DESC").all();
            return new Response(JSON.stringify(results), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "list_runs") {
            const { results } = await db.prepare("SELECT * FROM checklist_runs ORDER BY created_at DESC").all();
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

    if (!context.locals.session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const db = runtime.env.DB;
    const url = new URL(context.request.url);
    const action = url.searchParams.get("action");
    const body = await context.request.json().catch(() => ({}));

    try {
        if (action === "create_template") {
            const { name, description, items } = body;
            if (!name || !items || !Array.isArray(items)) {
                return new Response("Missing template name or items", { status: 400 });
            }
            const id = crypto.randomUUID();
            const now = Date.now();
            await db.prepare(
                "INSERT INTO checklist_templates (id, name, description, items_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(id, name, description || "", JSON.stringify(items), now, now).run();

            return new Response(JSON.stringify({ id, success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "start_run") {
            const { template_id, name } = body;
            if (!template_id || !name) {
                return new Response("Missing template_id or run name", { status: 400 });
            }

            // Retrieve template to initialize progress items
            const template = await db.prepare("SELECT * FROM checklist_templates WHERE id = ?")
                .bind(template_id)
                .get<any>();

            if (!template) {
                return new Response("Template not found", { status: 404 });
            }

            const items: string[] = JSON.parse(template.items_json);
            const progress = items.map(item => ({
                text: item,
                completed: false
            }));

            const id = crypto.randomUUID();
            const now = Date.now();
            await db.prepare(
                "INSERT INTO checklist_runs (id, template_id, name, status, progress_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).bind(id, template_id, name, "active", JSON.stringify(progress), now, now).run();

            return new Response(JSON.stringify({ id, success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "update_run_progress") {
            const { id, progress } = body;
            if (!id || !progress || !Array.isArray(progress)) {
                return new Response("Missing id or progress array", { status: 400 });
            }

            // Check if all items are completed to auto-complete the run status
            const allCompleted = progress.every(item => item.completed);
            const status = allCompleted ? "completed" : "active";
            const now = Date.now();

            await db.prepare(
                "UPDATE checklist_runs SET progress_json = ?, status = ?, updated_at = ? WHERE id = ?"
            ).bind(JSON.stringify(progress), status, now, id).run();

            return new Response(JSON.stringify({ success: true, status }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "delete_template") {
            const { id } = body;
            if (!id) {
                return new Response("Missing id", { status: 400 });
            }
            // Delete template and its runs
            await db.prepare("DELETE FROM checklist_runs WHERE template_id = ?").bind(id).run();
            await db.prepare("DELETE FROM checklist_templates WHERE id = ?").bind(id).run();
            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (action === "delete_run") {
            const { id } = body;
            if (!id) {
                return new Response("Missing id", { status: 400 });
            }
            await db.prepare("DELETE FROM checklist_runs WHERE id = ?").bind(id).run();
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
