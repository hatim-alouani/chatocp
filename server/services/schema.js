
export async function setupDatabase(fastify) {
  const db = fastify.db;

  await db.exec("PRAGMA foreign_keys = ON;");

  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      user_role TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_updated TEXT NOT NULL DEFAULT (datetime('now')),
      password_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      message_id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      speaker TEXT NOT NULL,
      message_index INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `;

  try {
    try {
      await db.exec("DROP TABLE IF EXISTS conversations;");
      fastify.log.info("Dropped old conversations table if it existed");
    } catch (err) {
    }

    await db.exec(schemaSQL);
    fastify.log.info("SQLite database schema ready.");
  } catch (err) {
    fastify.log.error("DB setup failed:", err);
    throw err;
  }
}
