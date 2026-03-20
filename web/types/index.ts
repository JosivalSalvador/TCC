// web/types/index.ts

// 1. Exportamos os Enums isolados
export * from "./enums";

// ==========================================
// 2. INFRAESTRUTURA (Para o http-client.ts)
// ==========================================
// Toda vez que o Fastify devolver um erro (400, 401, 404), o nosso motor
// vai capturar e jogar esse erro padronizado para a tela conseguir ler.
export interface HttpError {
  status: number;
  message: string;
}

// ==========================================
// 3. BARREL EXPORTS (O Coração da Tipagem)
// ==========================================
// Isso permite que o resto do app importe tudo de '@/types' direto.
// OBS: Certifique-se de que os nomes dos arquivos batem com a sua pasta types/
export * from "./sessions.types";
export * from "./users.types";
export * from "./refresh.types";