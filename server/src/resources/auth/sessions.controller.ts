import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import { TokenType } from '@prisma/client'
import * as sessionsService from './sessions.service.js'
import type { LoginInput } from './sessions.types.js'
import { TOKEN_TTL_CONFIG } from '../tokens/tokens.types.js'

/**
 * Login (Gera JWT + Cookie Refresh)
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  // AJUSTE AQUI: O tipo foi movido para a desestruturação
  const { email, password } = request.body as LoginInput

  const { user, refreshToken } = await sessionsService.authenticateUser({
    email,
    password,
  })

  // O Fastify JWT já embute a secret do app.ts
  const token = await reply.jwtSign(
    { role: user.role },
    {
      sign: {
        sub: user.id,
        expiresIn: '10m', // Access token curto (10 min) forçando rotação constante
      },
    },
  )

  return reply
    .setCookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      signed: true, // OBRIGATÓRIO para bater com o unsignCookie do refresh
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_TTL_CONFIG[TokenType.REFRESH_TOKEN].days * 24 * 60 * 60,
    })
    .status(StatusCodes.OK)
    .send({
      token,
      // Retorno casando perfeitamente com o loginResponseSchema (Zod)
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
}

/**
 * Logout (Limpa Cookie + Deleta do Banco)
 */
export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const rawCookie = request.cookies.refreshToken

  if (rawCookie) {
    // Desassina o cookie usando a secret global
    const unsigned = request.unsignCookie(rawCookie)

    /**
     * Lógica de extração segura:
     * 1. Se a assinatura for válida, usamos o valor limpo (UUID).
     * 2. Se for inválida (ex: cookie antigo não assinado), usamos o rawCookie original para tentar o match.
     */
    const tokenId = unsigned.valid && unsigned.value ? unsigned.value : rawCookie

    try {
      await sessionsService.signOut(tokenId)
    } catch (error) {
      // Se o banco cair, o log captura, mas o usuário não fica "preso" logado no frontend
      request.log.error(error, 'Erro ao invalidar refresh token no banco durante o logout')
    }
  }

  // Deleta o cookie do navegador de qualquer forma
  return reply
    .clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
    })
    .status(StatusCodes.NO_CONTENT)
    .send()
}
