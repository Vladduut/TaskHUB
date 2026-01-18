import type { FastifyInstance } from "fastify";
import { authController } from "./auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", authController.register);
  app.post("/auth/login", authController.login);
  app.post("/auth/logout", authController.logout);
  app.get("/auth/me", authController.me);
}
