import { app } from './app.js'
import { env } from './validateEnv/index.js'

const gracefulShutdown = async (signal: string) => {
  // Usando o logger do próprio app
  app.log.info(`Sinal ${signal} recebido. Encerrando servidor...`)

  try {
    await app.close()
    app.log.info('Servidor fechado com sucesso.')
    process.exit(0)
  } catch (err) {
    app.log.error({ err }, 'Erro ao fechar servidor')
    process.exit(1)
  }
}

app
  .listen({
    host: '0.0.0.0', // Corretíssimo para o Docker!
    port: env.PORT,
  })
  .then(() => {
    app.log.info(`HTTP Server running on http://localhost:${env.PORT}`)
  })

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
