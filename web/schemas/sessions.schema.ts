import { z } from "zod";
import { Role } from "../types/enums";
import { emailSchema } from "./users.schema";

// =========================
// Schema para Login (Input)
// =========================
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Senha é obrigatória" }),
});

// ==========================================
// Schema de Resposta (Output)
// ==========================================
export const loginResponseSchema = z.object({
  token: z.string().describe("JWT Access Token"),
  user: z.object({
    name: z.string(),
    email: z.email(),
    role: z.enum([Role.ADMIN, Role.SUPPORTER, Role.USER]), // ← Tipagem estrita de cargo com o Enum do Prisma!
  }),
});

// ==========================================
// Schema de Erro
// ==========================================
export const authErrorSchema = z.object({
  message: z.string(),
});
