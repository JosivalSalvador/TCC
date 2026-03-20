import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { StatusCodes } from 'http-status-codes'
import { Prisma } from '@prisma/client'
import { AppError } from '../errors/app-error.js'

export const errorHandler: FastifyInstance['errorHandler'] = (error, request, reply) => {
  // Casting para acessar propriedades específicas de erros do Fastify/Prisma de forma segura
  const knownError = error as Error & { code?: string; validation?: unknown }

  // 1. Erros de Validação Nativos do Fastify (Gerados pelo Type Provider Zod)
  // É AQUI QUE O SEU TESTE ESTAVA BATENDO E VOLTANDO 500
  if (knownError.code === 'FST_ERR_VALIDATION') {
    return reply.status(StatusCodes.BAD_REQUEST).send({
      message: 'Validation error',
      errors: knownError.validation, // Retorna exatamente qual campo falhou
    })
  }

  // 2. Erros de Validação Manuais (Zod)
  if (error instanceof ZodError) {
    return reply.status(StatusCodes.BAD_REQUEST).send({
      message: 'Validation error',
      errors: error.flatten((issue) => issue.message).fieldErrors,
    })
  }

  // 3. Erros de Regra de Negócio (AppError)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    })
  }

  // 4. Erros do Prisma (Banco de Dados)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Duplicidade (Unique constraint violation)
    if (error.code === 'P2002') {
      return reply.status(StatusCodes.CONFLICT).send({
        message: 'A resource with this unique identifier already exists.',
      })
    }

    // P2025: Registro não encontrado
    if (error.code === 'P2025') {
      return reply.status(StatusCodes.NOT_FOUND).send({
        message: 'Resource not found.',
      })
    }
  }

  // 5. Erros de JWT (Caso o token seja inválido/expirado)
  if (
    knownError.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
    knownError.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED'
  ) {
    return reply.status(StatusCodes.UNAUTHORIZED).send({
      message: 'Invalid or expired token.',
    })
  }

  // 6. Erros não tratados (Internal Server Error)
  const isProduction = process.env.NODE_ENV === 'production'

  if (!isProduction) {
    console.error(error) // Em DEV, explode o erro no terminal
  } else {
    // Em PROD, log estruturado sem vazar stack trace
    request.log.error({ err: error }, 'Unhandled error occurred')
  }

  return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
    message: 'Internal server error',
  })
}
