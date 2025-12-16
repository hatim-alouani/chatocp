export default async function (fastify, opts) {
  const pool = fastify.pool;

  fastify.get('/confirm', async (req, reply) => {
    const { token } = req.query;
    const result = await pool.query(
      `SELECT * FROM Users WHERE verification_token=$1 AND token_expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0)
      return reply.code(400).send('Invalid or expired token.');

    reply.redirect(`${process.env.FRONTEND_URL}/set-password?token=${token}`);
  });
}
