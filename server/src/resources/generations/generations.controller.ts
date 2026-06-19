import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import * as generationsService from './generations.service.js'
import type { CreateGenerationInput, FavoriteUpdateInput, ListGenerationsQuery } from './generations.types.js'

/**
 * CRIAR GERAÇÃO
 * Dispara a chamada ao serviço de IA e persiste o resultado.
 */
export async function create(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  const body = request.body as CreateGenerationInput
  const { generation } = await generationsService.createGeneration(userId, body)

  return reply.status(StatusCodes.CREATED).send({
    message: 'Generation created successfully.',
    generation,
  })
}

/**
 * LISTAR GERAÇÕES DO USUÁRIO LOGADO
 * Aceita filtro de favorito via query string.
 */
export async function list(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  const query = request.query as ListGenerationsQuery
  const { generations } = await generationsService.listUserGenerations(userId, query)

  return reply.status(StatusCodes.OK).send({ generations })
}

/**
 * BUSCAR GERAÇÃO ESPECÍFICA
 */
export async function getOne(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  const { id } = request.params as { id: string }
  const { generation } = await generationsService.getGenerationById(userId, id)

  return reply.status(StatusCodes.OK).send({ generation })
}

/**
 * MARCAR/DESMARCAR FAVORITO
 */
export async function updateFavorite(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  const { id } = request.params as { id: string }
  const body = request.body as FavoriteUpdateInput
  const { generation } = await generationsService.updateFavorite(userId, id, body)

  return reply.status(StatusCodes.OK).send({
    message: 'Favorite status updated successfully.',
    generation,
  })
}
