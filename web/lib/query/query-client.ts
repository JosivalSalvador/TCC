import { isServer, QueryClient } from "@tanstack/react-query";

/**
 * Cria uma instância limpa do QueryClient com as configurações padrão
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minuto
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Variável para armazenar o cliente APENAS no navegador
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Singleton Pattern para Next.js App Router
 * Garante isolamento no servidor e persistência no cliente.
 */
export function getQueryClient() {
  if (isServer) {
    // Servidor: SEMPRE cria uma nova instância
    return makeQueryClient();
  } else {
    // Browser: Se não existir, cria. Se existir, reutiliza.
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
