import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { Role } from '@prisma/client' // Importar o Enum do Prisma é boa prática

export function verifyUserRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = request.user

    // Verifica se a role do usuário logado está na lista de permitidas
    if (!allowedRoles.includes(role as Role)) {
      return reply.status(StatusCodes.FORBIDDEN).send({
        message: 'Forbidden: Insufficient privileges.',
      })
    }
  }
}
