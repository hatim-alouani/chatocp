export default async function (fastify, opts) {
  const pool = fastify.pool;

  fastify.get('/', async () => ({ status: 'Server is running' }));

  fastify.get('/db-test', async () => {
    const result = await pool.query('SELECT NOW()');
    return { status: 'Database OK', time: result.rows[0].now };
  });
}
