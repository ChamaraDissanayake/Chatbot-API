import Database from "better-sqlite3";
import path from "path";

// ✅ Use `/tmp/` for Render to avoid permission issues
const dbPath = path.join("/tmp", "chat-history.db");

// ✅ Initialize SQLite database
const db = new Database(dbPath, { fileMustExist: false });

console.log(`📂 SQLite database initialized at ${dbPath}`);

// ✅ Create tables if they don’t exist
db.exec(`
    PRAGMA journal_mode = WAL; -- Improves write performance

    CREATE TABLE IF NOT EXISTS chat_threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')), -- Ensures valid roles
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
    );

    -- ✅ Optimized indexes for faster lookups
    CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
`);

// ✅ Function to delete old messages (automatic cleanup)
export function deleteOldMessages() {
    try {
        const stmt = db.prepare("DELETE FROM chat_messages WHERE timestamp < DATE('now', '-30 days')");
        const changes = stmt.run().changes; // Get number of deleted rows
        console.log(`🗑️ Deleted ${changes} old messages`);
    } catch (error) {
        console.error("❌ Failed to delete old messages:", error);
    }
}

// ✅ Default export at the top level
export default db;
