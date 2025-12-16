import bcryptjs from 'bcryptjs';
import jwt from "jsonwebtoken";

export default async function authRoutes(fastify, opts) {
  const db = fastify.db;

  fastify.post("/auth/register", async (req, reply) => {
    try {
      const { full_name, email, password, user_role } = req.body;

      if (!full_name || !email || !password) {
        return reply.code(400).send({ ok: false, error: "Full name, email, and password are required" });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const existingUser = await db.get(
        `SELECT user_id FROM users WHERE email = ?`,
        [email]
      );

      let userId;

      if (existingUser) {
        await db.run(
          `UPDATE users 
           SET full_name = ?, user_role = ?, password_hash = ?, status = 'active', last_updated = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [full_name, user_role || null, hashedPassword, existingUser.user_id]
        );
        userId = existingUser.user_id;
      } else {
        const result = await db.run(
          `INSERT INTO users (full_name, email, user_role, password_hash, status) VALUES (?, ?, ?, ?, 'active')`,
          [full_name, email, user_role || null, hashedPassword]
        );
        userId = result.lastID;
      }

      const token = jwt.sign(
        { user_id: userId, email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      reply.send({
        ok: true,
        token,
        user: {
          user_id: userId,
          email,
          full_name,
          user_role: user_role || null,
          status: 'active',
        },
      });
    } catch (err) {
      fastify.log.error("Registration error:", err);
      console.error("Full registration error:", err);
      reply.code(500).send({ ok: false, error: "Failed to register user" });
    }
  });

  fastify.post("/auth/login", async (req, reply) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return reply.code(400).send({ ok: false, error: "Email and password are required" });
      }

      const user = await db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email]
      );

      if (!user || !user.password_hash) {
        return reply.code(401).send({ ok: false, error: "Invalid email or password" });
      }

      const match = await bcryptjs.compare(password, user.password_hash);
      if (!match) {
        return reply.code(401).send({ ok: false, error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { user_id: user.user_id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      reply.send({
        ok: true,
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          user_role: user.user_role,
          status: user.status,
        },
      });
    } catch (err) {
      fastify.log.error("Login error:", err);
      console.error("Full login error:", err);
      reply.code(500).send({ ok: false, error: "Server error" });
    }
  });

  fastify.post("/auth/logout", async (req, reply) => {
    try {
      reply.setCookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });

      reply.send({
        ok: true,
        message: "Logged out successfully",
      });
    } catch (err) {
      fastify.log.error("Logout error:", err);
      reply.code(500).send({ ok: false, error: "Logout failed" });
    }
  });
}
