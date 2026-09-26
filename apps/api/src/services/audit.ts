import type { Queryable } from '../db.js';

export async function audit(
  q: Queryable,
  adminUserId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
): Promise<void> {
  await q.query(
    `INSERT INTO admin_audit_log (admin_user_id, action, entity_type, entity_id, before_json, after_json) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      adminUserId,
      action,
      entityType,
      entityId,
      before === undefined ? null : JSON.stringify(before),
      after === undefined ? null : JSON.stringify(after),
    ],
  );
}
