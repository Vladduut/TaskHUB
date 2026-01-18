import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function projectRoutes(app: FastifyInstance) {
  // list projects (user only)
  app.get(
    "/projects",
    { preHandler: [app.authenticate] },
    async (request: any) => {
      const userId = request.user.sub;

      return prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    }
  );

  // create project
  app.post(
    "/projects",
    { preHandler: [app.authenticate] },
    async (request: any, reply) => {
      const userId = request.user.sub;
      const body = request.body as { name: string };

      const name = (body?.name || "").trim();
      if (!name) return reply.status(400).send({ message: "Nume invalid" });

      const project = await prisma.project.create({
        data: { name, userId },
      });

      return project;
    }
  );

  // rename project
  app.put(
    "/projects/:id",
    { preHandler: [app.authenticate] },
    async (request: any, reply) => {
      const userId = request.user.sub;
      const { id } = request.params as { id: string };
      const body = request.body as { name: string };

      const name = (body?.name || "").trim();
      if (!name) return reply.status(400).send({ message: "Nume invalid" });

      const project = await prisma.project.findFirst({ where: { id, userId } });
      if (!project) return reply.status(404).send({ message: "Project inexistent" });

      return prisma.project.update({
        where: { id },
        data: { name },
      });
    }
  );

  // delete project (and tasks)
  app.delete(
    "/projects/:id",
    { preHandler: [app.authenticate] },
    async (request: any, reply) => {
      const userId = request.user.sub;
      const { id } = request.params as { id: string };

      const project = await prisma.project.findFirst({ where: { id, userId } });
      if (!project) return reply.status(404).send({ message: "Project inexistent" });

      await prisma.task.deleteMany({ where: { projectId: id } });
      await prisma.project.delete({ where: { id } });

      return { message: "Deleted" };
    }
  );
}
