import '@fastify/jwt'

declare module '@fastify/jwt' {
  export interface FastifyJWT {
    // O que vai dentro do payload do token
    user: {
      sub: string
      role: 'ADMIN' | 'SUPPORTER' | 'USER'
    }
  }
}
