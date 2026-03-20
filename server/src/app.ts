import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fastifySwagger from '@fastify/swagger'
import apiReference from '@scalar/fastify-api-reference'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import {
  validatorCompiler,
  serializerCompiler,
  type ZodTypeProvider,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod'

// AJUSTE 1: Caminho corrigido para bater com sua pasta 'router'
import { routes } from './router/index.js'
import { healthRoutes } from './router/health.routes.js'
import { errorHandler } from './lib/error-handler.js'
import { env } from './validateEnv/index.js'

export const app = fastify({
  logger:
    env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
              colorize: true,
            },
          },
        }
      : true,
}).withTypeProvider<ZodTypeProvider>()

// --- COMPILADORES ZOD ---
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// --- SEGURANÇA (INFRA) ---

// 1. Helmet
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net'],
    },
  },
})

// 2. Rate Limit
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => {
    return {
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Você excedeu o limite de requisições. Tente novamente em ${context.after}.`,
    }
  },
})

// 3. Cookie (ANTES DO CORS E ROTAS)
app.register(fastifyCookie, {
  secret: env.JWT_SECRET,
  hook: 'onRequest',
})

// 4. CORS
app.register(cors, {
  origin: (origin, cb) => {
    // Permite localhost e chamadas sem origin (mobile/postman)
    if (!origin || origin.startsWith('http://localhost')) {
      cb(null, true)
      return
    }
    // Em prod, aqui entra a validação do domínio real
    cb(null, true)
  },
  credentials: true, // OBRIGATÓRIO para os cookies funcionarem
})

// 5. JWT
app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: '10m',
  },
  // AJUSTE 2: Removi a configuração de 'cookie' daqui.
  // Motivo: O cookie 'refreshToken' carrega um UUID, não um JWT.
  // Se deixarmos isso aqui, o plugin tenta ler o UUID como JWT e falha.
})

// --- DOCUMENTAÇÃO ---
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Crochê da T API',
      description: 'API Profissional Node.js',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [{ name: 'Infra', description: 'Rotas de infraestrutura e monitoramento' }],
  },
  transform: jsonSchemaTransform,
})

app.register(apiReference, {
  routePrefix: '/docs',
  configuration: {
    theme: 'purple',
  },
})

// --- ROTAS ---
app.register(healthRoutes)
app.register(routes) // Registrando as rotas da V1

// --- ERROR HANDLER ---
app.setErrorHandler(errorHandler)
