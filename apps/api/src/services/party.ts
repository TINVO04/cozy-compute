import type { AppContext } from '../context.js';
import { badRequest, forbidden } from '../errors.js';
import { gameplayAction } from './gameplay-actions.js';
export async function partyState(ctx: AppContext, userId: string) {
  const membership = await ctx.db.query<{ party_id: string }>(
    `SELECT party_id FROM resident_party_members WHERE user_id=$1`,
    [userId],
  );
  const id = membership.rows[0]?.party_id;
  const invites = await ctx.db.query(
    `SELECT i.party_id,p.display_name AS name FROM resident_party_invites i JOIN resident_parties g ON g.id=i.party_id JOIN profiles p ON p.user_id=g.leader_id WHERE i.user_id=$1 AND i.expires_at>$2`,
    [userId, ctx.now()],
  );
  if (!id) return { id: null, members: [], messages: [], invites: invites.rows };
  const members = await ctx.db.query(
    `SELECT p.user_id id,p.display_name name,g.leader_id=p.user_id AS leader FROM resident_party_members m JOIN profiles p ON p.user_id=m.user_id JOIN resident_parties g ON g.id=m.party_id WHERE m.party_id=$1 ORDER BY leader DESC,p.display_name`,
    [id],
  );
  const messages = await ctx.db.query(
    `SELECT m.id,p.display_name name,m.body,m.created_at FROM resident_party_messages m JOIN profiles p ON p.user_id=m.user_id WHERE m.party_id=$1 ORDER BY m.id DESC LIMIT 50`,
    [id],
  );
  return { id, members: members.rows, messages: messages.rows.reverse(), invites: invites.rows };
}
export function partyAction(
  ctx: AppContext,
  userId: string,
  key: string,
  kind: 'create' | 'invite' | 'accept' | 'decline' | 'leave' | 'chat',
  value: string,
) {
  return gameplayAction(ctx, userId, key, JSON.stringify({ kind, value }), async (tx) => {
    const membership = await tx.query<{ party_id: string }>(
      'SELECT party_id FROM resident_party_members WHERE user_id=$1',
      [userId],
    );
    const id = membership.rows[0]?.party_id;
    if (kind === 'create') {
      if (id) throw badRequest('already_grouped', 'Bạn đã có tổ đội.');
      const group = await tx.query<{ id: string }>(
        'INSERT INTO resident_parties(leader_id) VALUES($1) RETURNING id',
        [userId],
      );
      await tx.query('INSERT INTO resident_party_members(user_id,party_id) VALUES($1,$2)', [
        userId,
        group.rows[0]!.id,
      ]);
    } else if (kind === 'accept' || kind === 'decline') {
      const group = await tx.query('SELECT id FROM resident_parties WHERE id=$1 FOR UPDATE', [value]);
      if (!group.rowCount) throw badRequest('invite_expired', 'Tổ đội không còn tồn tại.');
      const invite = await tx.query(
        'DELETE FROM resident_party_invites WHERE party_id=$1 AND user_id=$2 AND expires_at>$3 RETURNING party_id',
        [value, userId, ctx.now()],
      );
      if (!invite.rowCount) throw badRequest('invite_expired', 'Lời mời đã hết hạn.');
      if (kind === 'accept') {
        if (id) throw badRequest('already_grouped', 'Hãy rời tổ đội hiện tại trước.');
        const count = await tx.query<{ n: number }>(
          'SELECT count(*)::int n FROM resident_party_members WHERE party_id=$1',
          [value],
        );
        if (count.rows[0]!.n >= 4) throw badRequest('party_full', 'Tổ đội đã đủ 4 người.');
        await tx.query('INSERT INTO resident_party_members(user_id,party_id) VALUES($1,$2)', [userId, value]);
      }
    } else {
      if (!id) throw badRequest('no_party', 'Bạn chưa có tổ đội.');
      const group = await tx.query<{ leader_id: string }>(
        'SELECT leader_id FROM resident_parties WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (!group.rows[0]) throw badRequest('no_party', 'Tổ đội đã giải tán.');
      const stillMember = await tx.query(
        'SELECT 1 FROM resident_party_members WHERE user_id=$1 AND party_id=$2',
        [userId, id],
      );
      if (!stillMember.rowCount) throw forbidden('Bạn không còn trong tổ đội.');
      if (kind === 'invite') {
        if (group.rows[0].leader_id !== userId) throw forbidden('Chỉ đội trưởng được mời.');
        const friend = await tx.query('SELECT 1 FROM friends WHERE user_id=$1 AND friend_id=$2', [
          userId,
          value,
        ]);
        const muted = await tx.query('SELECT 1 FROM mutes WHERE user_id=$1 AND muted_id=$2', [value, userId]);
        if (!friend.rowCount || muted.rowCount) throw forbidden('Không thể gửi lời mời cho người này.');
        await tx.query(
          'INSERT INTO resident_party_invites(party_id,user_id,expires_at) VALUES($1,$2,$3) ON CONFLICT(party_id,user_id) DO UPDATE SET expires_at=EXCLUDED.expires_at',
          [id, value, new Date(ctx.now().getTime() + 600000)],
        );
      } else if (kind === 'leave') {
        if (group.rows[0].leader_id === userId)
          await tx.query('DELETE FROM resident_parties WHERE id=$1', [id]);
        else await tx.query('DELETE FROM resident_party_members WHERE user_id=$1', [userId]);
      } else {
        const recent = await tx.query(
          'SELECT 1 FROM resident_party_messages WHERE party_id=$1 AND user_id=$2 AND created_at>$3',
          [id, userId, new Date(ctx.now().getTime() - 1000)],
        );
        if (recent.rowCount) throw badRequest('chat_cooldown', 'Hãy chờ một giây trước tin tiếp theo.');
        await tx.query(
          'INSERT INTO resident_party_messages(party_id,user_id,body,created_at) VALUES($1,$2,$3,$4)',
          [id, userId, value, ctx.now()],
        );
      }
    }
    return { ok: true };
  });
}
