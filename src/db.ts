export interface AssetType {
    id: string;
    name: string;
    icon: string;
    description: string;
    fields_json: string; // JSON string of array of fields: { name: string, type: 'text' | 'password' | 'textarea' | 'bitwarden_item' | 'bitwarden_collection' }
}

export interface Asset {
    id: string;
    asset_type_id: string;
    name: string;
    values_json: string; // JSON string of object mapping field names to values
    created_at: number;
    updated_at: number;
}

export interface ChecklistTemplate {
    id: string;
    name: string;
    description: string;
    items_json: string; // JSON string of array of items: string[]
    created_at: number;
    updated_at: number;
}

export interface ChecklistRun {
    id: string;
    template_id: string;
    name: string;
    status: 'active' | 'completed';
    progress_json: string; // JSON string of array of items: { text: string, completed: boolean, completed_at?: number }[]
    created_at: number;
    updated_at: number;
}

export interface Setting {
    key: string;
    value: string;
}

let tablesInitialized = false;

export async function initializeD1(db: D1Database) {
    if (tablesInitialized) return;

    // Better Auth + Custom Application Tables
    const schema = `
        CREATE TABLE IF NOT EXISTS user (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            emailVerified INTEGER NOT NULL,
            image TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS session (
            id TEXT PRIMARY KEY,
            expiresAt INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            ipAddress TEXT,
            userAgent TEXT,
            userId TEXT NOT NULL,
            FOREIGN KEY (userId) REFERENCES user (id)
        );

        CREATE TABLE IF NOT EXISTS account (
            id TEXT PRIMARY KEY,
            accountId TEXT NOT NULL,
            providerId TEXT NOT NULL,
            userId TEXT NOT NULL,
            accessToken TEXT,
            refreshToken TEXT,
            idToken TEXT,
            accessTokenExpiresAt INTEGER,
            refreshTokenExpiresAt INTEGER,
            scope TEXT,
            password TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            FOREIGN KEY (userId) REFERENCES user (id)
        );

        CREATE TABLE IF NOT EXISTS verification (
            id TEXT PRIMARY KEY,
            identifier TEXT NOT NULL,
            value TEXT NOT NULL,
            expiresAt INTEGER NOT NULL,
            createdAt INTEGER,
            updatedAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS asset_types (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            description TEXT,
            fields_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            asset_type_id TEXT NOT NULL,
            name TEXT NOT NULL,
            values_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (asset_type_id) REFERENCES asset_types (id)
        );

        CREATE TABLE IF NOT EXISTS checklist_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            items_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS checklist_runs (
            id TEXT PRIMARY KEY,
            template_id TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            progress_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (template_id) REFERENCES checklist_templates (id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `;

    // Split schema into individual SQL statements to execute on D1
    // D1 exec() accepts raw string block and runs all of them
    try {
        await db.exec(schema);
        tablesInitialized = true;
    } catch (e) {
        console.error("Failed to initialize database tables:", e);
    }
}
