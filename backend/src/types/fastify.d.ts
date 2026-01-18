import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }

  interface FastifyRequest {
    user?: {
      sub: string;
      email: string;
      name: string;
    };
  }
}
