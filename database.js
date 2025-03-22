import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Define a persistent database path for Render
const dbPath = "/var/data/chat-history.db";

// Ensure the /var/data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize SQLite database
const db = new Database(dbPath);

// Initialize tables if they don’t exist
db.exec(`
    CREATE TABLE IF NOT EXISTS chat_threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(thread_id) REFERENCES chat_threads(id)
    );

    -- Create indexes for faster lookups
    CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
`);

export default db;

// Function to delete messages older than 30 days
export function deleteOldMessages() {
    const stmt = db.prepare("DELETE FROM chat_messages WHERE timestamp < DATE('now', '-30 days')");
    const changes = stmt.run().changes; // Get number of deleted rows
    console.log(`🗑️ Deleted ${changes} old messages`);
}