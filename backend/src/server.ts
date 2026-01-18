import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { authRoutes } from "./modules/auth/auth.routes.js";
import { projectRoutes } from "./modules/project/project.routes.js";
import { taskRoutes } from "./modules/task/task.routes.js";

const app = Fastify({ logger: true });

async function start() {
  // CORS (frontend pe 5173)
  await app.register(cors, {
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Cookies
  await app.register(cookie);

  // JWT (cookie-based)
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "dev_secret_change_me",
    cookie: {
      cookieName: "token",
      signed: false,
    },
  });

  // ✅ AICI e cheia: decoram authenticate INAINTE sa inregistram rutele
  app.decorate("authenticate", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ message: "Neautorizat" });
    }
  });

  // Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: "TaskHub API",
        version: "1.0.0",
        description: "API pentru proiecte si task-uri (cookie JWT).",
      },
      servers: [{ url: "http://localhost:3000" }],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: "/docs",
  });

  // Health
  app.get("/health", async () => ({ ok: true }));

  // Routes
  await app.register(authRoutes);
  await app.register(projectRoutes);
  await app.register(taskRoutes);

  const port = Number(process.env.PORT || 3000);
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
