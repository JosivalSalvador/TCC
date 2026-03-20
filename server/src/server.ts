import { app } from './app.js'
import { env } from './validateEnv/index.js'

// Função para encerrar o servidor de forma segura
const gracefulShutdown = async (signal: string) => {
  console.info(`\n Sinal ${signal} recebido. Encerrando servidor...`)

  try {
    // Fecha o Fastify (para de aceitar novas requisições e espera as atuais terminarem)
    await app.close()
    console.info('Servidor fechado com sucesso.')
    process.exit(0)
  } catch (err) {
    console.error('Erro ao fechar servidor:', err)
    process.exit(1)
  }
}

app
  .listen({
    host: '0.0.0.0',
    port: env.PORT,
  })
  .then(() => {
    // .info é semanticamente correto para informar que o sistema subiu
    console.info(`HTTP Server running on http://localhost:${env.PORT}`)
  })

// Escuta sinais de encerramento do sistema
process.on('SIGINT', () => gracefulShutdown('SIGINT')) // Ctrl + C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')) // Docker stop
