import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Verifica se o token é válido e não expirou
    await request.jwtVerify()
  } catch {
    // Se falhar (token inválido, expirado ou ausente), retorna 401
    return reply.status(StatusCodes.UNAUTHORIZED).send({ message: 'Unauthorized.' })
  }
}
