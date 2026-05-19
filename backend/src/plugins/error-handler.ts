import { FastifyPluginAsync } from 'fastify';

export const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    if (reply.sent) {
      return;
    }

    const err = error as { statusCode?: number; message?: string };
    const statusCode = err.statusCode ?? 500;
    reply.code(statusCode).send({
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: statusCode >= 500 ? 'Internal server error.' : err.message ?? 'Request error.'
    });
  });
};
