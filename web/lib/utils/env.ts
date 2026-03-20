import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Helper robusto para validar URLs de infraestrutura (Docker e Public)
// Aceita: "http://localhost:3000", "http://api:3333", "https://meusite.com"
const requiredUrl = z
  .string()
  .min(1, "A URL é obrigatória")
  .refine(
    (str) => str.startsWith("http://") || str.startsWith("https://"),
    "A URL deve começar com http:// ou https://",
  );

export const env = createEnv({
  /*
   * Variáveis de SERVIDOR (Node.js)
   * Apenas o container ou o servidor vê.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    // Validamos que é uma string http/https, sem exigir TLD (.com)
    // Isso permite que "http://api:3333" passe sem erros.
    API_INTERNAL_URL: requiredUrl,
  },

  /*
   * Variáveis de CLIENTE (Browser)
   * Expostas publicamente.
   */
  client: {
    NEXT_PUBLIC_API_URL: requiredUrl,
  },

  /*
   * Runtime Env
   * O elo entre o sistema operacional e a validação
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Evita que o build do Docker falhe se as envs não estiverem presentes na hora do 'npm run build'
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
