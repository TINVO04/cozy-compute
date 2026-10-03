import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgres://cozy:cozy_dev_password@127.0.0.1:5432/cozy';
const pool = new Pool({ connectionString });

async function grantInfiniteMoney() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const users = await client.query(
      'SELECT u.id, u.email, p.display_name, b.coin FROM users u LEFT JOIN profiles p ON u.id = p.user_id LEFT JOIN balances b ON u.id = b.user_id',
    );
    console.log(`Found ${users.rows.length} users:`);

    for (const u of users.rows) {
      const targetCoin = 999999999;
      const targetAiCredit = 99999900; // 999,999.00 USD cents
      const targetFame = 999999;

      await client.query(
        'UPDATE balances SET coin = $1, ai_credit_cents = $2, updated_at = now() WHERE user_id = $3',
        [targetCoin, targetAiCredit, u.id],
      );

      await client.query('UPDATE profiles SET fame = $1, updated_at = now() WHERE user_id = $2', [
        targetFame,
        u.id,
      ]);

      await client.query(
        `INSERT INTO ledger_entries (user_id, currency, amount, balance_after, reason_type, reference_id, metadata)
         VALUES ($1, 'coin', $2, $3, 'admin_grant', 'infinite_test_grant', '{"note":"developer testing infinite funds"}')`,
        [u.id, targetCoin, targetCoin],
      );

      console.log(
        `- ${u.display_name || u.email} (${u.email}): ${u.coin} -> ${targetCoin.toLocaleString()} Coin, ${targetFame.toLocaleString()} Fame, $${(targetAiCredit / 100).toLocaleString()} AI Credit`,
      );
    }

    await client.query('COMMIT');
    console.log('\n[SUCCESS] Đã cấp tiền vô hạn thành công cho tất cả tài khoản!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR] Lỗi khi cấp tiền:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

void grantInfiniteMoney();
