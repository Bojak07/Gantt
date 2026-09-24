export function logChange(db, entityType, entityId, action, details = '') {
  try {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);
    const stmt = db.prepare(`
      INSERT INTO change_history (entity_type, entity_id, action, details, timestamp)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(entityType, String(entityId), action, detailsStr);
  } catch (err) {
    console.error('Failed to log audit change:', err);
  }
}
