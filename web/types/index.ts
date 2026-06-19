// 1. Exportamos os Enums isolados
export * from "./enums";

// ==========================================
// 2. INFRAESTRUTURA (Para o http-client.ts)
// ==========================================
export interface HttpError {
  status: number;
  message: string;
}

// ==========================================
// 3. BARREL EXPORTS
// ==========================================
export * from "./sessions.types";
export * from "./users.types";
export * from "./refresh.types";
export * from "./niches.types";
export * from "./generations.types";
export * from "./feedbacks.types";
