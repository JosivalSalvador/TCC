import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import * as nichesService from './niches.service.js'
import type { NicheInput, RemoveNicheInput } from './niches.types.js'

/**
 * LISTAR POOL GLOBAL DE NICHOS
 * Público — usado pelo front para popular o dropdown na tela de cadastro e gerenciamento.
 */
export async function listAll(request: FastifyRequest, reply: FastifyReply) {
  const { niches } = await nichesService.listAllNiches()

  return reply.status(StatusCodes.OK).send({ niches })
}

/**
 * LISTAR NICHOS DO USUÁRIO LOGADO
 * Retorna apenas os nichos vinculados à conta do usuário autenticado.
 */
export async function listMine(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  const { niches } = await nichesService.listUserNiches(userId)

  return reply.status(StatusCodes.OK).send({ niches })
}

/**
 * VINCULAR NICHO À CONTA
 * Recebe o nome do nicho (digitado ou selecionado — chega igual ao servidor).
 * O service resolve o upsert no pool global e cria o vínculo.
 */
export async function addNiche(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  // Cast de tipo na variável — padrão do projeto
  const body = request.body as NicheInput
  const { niche } = await nichesService.addNicheToUser(userId, body)

  return reply.status(StatusCodes.CREATED).send({
    message: 'Niche linked successfully.',
    niche,
  })
}

/**
 * DESVINCULAR NICHO DA CONTA
 * Recebe o ID do nicho via params.
 * O service bloqueia a operação se for o último nicho do usuário.
 */
export async function removeNiche(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  // Cast de tipo na variável — padrão do projeto
  const { id } = request.params as RemoveNicheInput
  await nichesService.removeNicheFromUser(userId, { id })

  return reply.status(StatusCodes.NO_CONTENT).send()
}
