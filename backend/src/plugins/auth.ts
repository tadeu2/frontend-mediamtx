import { FastifyPluginAsync } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    verifyAdminAuth: (authorizationHeader?: string) => boolean;
  }
}

interface AuthPluginOptions {
  expectedToken?: string;
}

export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  fastify.decorate('verifyAdminAuth', (authorizationHeader?: string) => {
    if (!options.expectedToken) {
      return true;
    }

    if (!authorizationHeader?.startsWith('Bearer ')) {
      return false;
    }

    const presentedToken = authorizationHeader.slice('Bearer '.length).trim();
    return presentedToken.length > 0 && presentedToken === options.expectedToken;
  });

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url === '/healthz' || !request.url.startsWith('/api/')) {
      return;
    }

    const isAuthorized = fastify.verifyAdminAuth(request.headers.authorization);
    if (!isAuthorized) {
      reply.code(401).send({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.'
      });
    }
  });
};
