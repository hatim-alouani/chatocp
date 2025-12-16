import dotenv from "dotenv";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";

import sqlite3 from "sqlite3";
import { open } from "sqlite";

import { setupDatabase } from "./services/schema.js";
import authRoutes from "./routes/auth.js";
import confirmRoutes from "./routes/confirm.js";
import healthRoutes from "./routes/health.js";
import chatRoutes from "./routes/chat.js";

import jwt from "jsonwebtoken";

dotenv.config();

const fastify = Fastify({ logger: true });

await fastify.register(fastifyCors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Conversation-Id"],
  credentials: true,
});

await fastify.register(fastifyCookie);

fastify.addHook("onRequest", async (req, reply) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies.token;

  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.replace("Bearer ", "") 
    : cookieToken;

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
      fastify.log.warn("Invalid JWT");
    }
  }
});

const db = await open({
  filename: "./database.sqlite",
  driver: sqlite3.Database,
});
fastify.decorate("db", db);

await setupDatabase(fastify);

fastify.register(healthRoutes);
fastify.register(authRoutes);
fastify.register(chatRoutes);

const start = async () => {
  try {
    const port = process.env.PORT || 3000;

    await fastify.listen({
      port,
      host: "0.0.0.0",
    });

    fastify.log.info(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
