import type { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";

type RegisterBody = {
  email: string;
  password: string;
  name: string;
};

type LoginBody = {
  email: string;
  password: string;
};

export const authController = {
  async register(req: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
    const { email, password, name } = req.body || ({} as any);

    if (!email || !password || !name) {
      return reply.status(400).send({ message: "email, password, name sunt obligatorii" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ message: "Email deja folosit" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash, // in schema.prisma câmpul e "password"
      },
      select: { id: true, email: true, name: true },
    });

    return reply.status(201).send({ user });
  },

  async login(req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    const { email, password } = req.body || ({} as any);

    if (!email || !password) {
      return reply.status(400).send({ message: "email si password sunt obligatorii" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ message: "Email sau parola invalide" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return reply.status(401).send({ message: "Email sau parola invalide" });
    }

    const token = (req.server as any).jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    reply.setCookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      // secure: true, // pe HTTPS; pe localhost lasă-l comentat
    });

    // IMPORTANT: frontend-ul vrea { user: {...} }
    return reply.send({
      user: { id: user.id, email: user.email, name: user.name },
    });
  },

  async logout(_req: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie("token", { path: "/" });
    return reply.send({ ok: true });
  },

  async me(req: FastifyRequest, reply: FastifyReply) {
    try {
      const token = (req.cookies as any)?.token;
      if (!token) return reply.status(401).send({ message: "Neautorizat" });

      const payload = (req.server as any).jwt.verify(token) as any;
      const userId = payload?.sub;
      if (!userId) return reply.status(401).send({ message: "Neautorizat" });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });
      if (!user) return reply.status(401).send({ message: "Neautorizat" });

      // IMPORTANT: frontend-ul vrea { user: {...} }
      return reply.send({ user });
    } catch {
      return reply.status(401).send({ message: "Neautorizat" });
    }
  },
};
