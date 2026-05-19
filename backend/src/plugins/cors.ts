import fastifyCors from '@fastify/cors';
import { FastifyPluginAsync } from 'fastify';

interface CorsPluginOptions {
  origin: string;
}

export const corsPlugin: FastifyPluginAsync<CorsPluginOptions> = async (fastify, options) => {
  const allowAll = options.origin === '*';

  await fastify.register(fastifyCors, {
    origin: allowAll ? true : options.origin,
    credentials: !allowAll
  });
};
