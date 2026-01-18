import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function taskRoutes(app: FastifyInstance) {
  // list tasks for a project
  app.get(
    "/tasks",
    { preHandler: [app.authenticate] },
    async (request: any, reply) => {
      const userId = request.user.sub;
      const { projectId } = request.query as { projectId?: string };

      if (!projectId) {
        return reply.status(400).send({ message: "projectId este obligatoriu" });
      }

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
      });
      if (!project) return reply.status(404).send({ message: "Project inexistent" });

      return prisma.task.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });
    }
  );

  // create task
  app.post(
    "/tasks",
    { preHandler: [app.authenticate] },
    async (request: any, reply) => {
      const userId = request.user.sub;
      const body = request.body as { projectId: string; title: string };

      const projectId = body?.projectId;
      const title = (body?.title || "").trim();

      if (!projectId || !title) {
        return reply.status(400).send({ message: "projectId si title sunt obligatorii" });
      }

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
      });
      if (!project) return reply.status(404).send({ message: "Project inexistent" });

      return prisma.task.create({
        data: {
          title,
          projectId,
          completed: false,
        },
      });
    }
  );

  // toggle/update task
  // IMPORTANT: daca NU trimiti body ({} / undefined), facem TOGGLE pe completed
  app.put(
    "/tasks/:id",
    { preHandler: [app.authenticate] },
    async (request: any, reply) => {
      const userId = request.user.sub;
      const { id } = request.params as { id: string };

      const body = (request.body ?? {}) as { title?: string; completed?: boolean };

      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) return reply.status(404).send({ message: "Task inexistent" });

      const project = await prisma.project.findFirst({
        where: { id: task.projectId, userId },
      });
      if (!project) return reply.status(403).send({ message: "Nu ai acces la acest task" });

      const hasUpdates = body.title !== undefined || body.completed !== undefined;

      // 1) FARA BODY => toggle
      if (!hasUpdates) {
        return prisma.task.update({
          where: { id },
          data: { completed: !task.completed },
        });
      }

      // 2) Cu body => update partial
      const data: { title?: string; completed?: boolean } = {};

      if (body.title !== undefined) {
        const t = body.title.trim();
        if (!t) {
          return reply.status(400).send({ message: "title nu poate fi gol" });
        }
        data.title = t;
      }

      if (body.completed !== undefined) {
        data.completed = body.completed;
      }

      return prisma.task.update({
        where: { id },
        data,
      });
    }
  );

  // delete task
  app.delete(
    "/tasks/:id",
    { preHandler: [app.authenticate] },
    async (request: any, reply) => {
      const userId = request.user.sub;
      const { id } = request.params as { id: string };

      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) return reply.status(404).send({ message: "Task inexistent" });

      const project = await prisma.project.findFirst({
        where: { id: task.projectId, userId },
      });
      if (!project) return reply.status(403).send({ message: "Nu ai acces la acest task" });

      await prisma.task.delete({ where: { id } });
      return { message: "Deleted" };
    }
  );
}
