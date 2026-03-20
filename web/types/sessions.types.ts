import { z } from "zod";
import {
  loginResponseSchema,
  loginSchema,
  authErrorSchema,
} from "../schemas/sessions.schema";

// Tipos de Entrada
export type LoginInput = z.infer<typeof loginSchema>;

// Tipos de Resposta
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export type authError = z.infer<typeof authErrorSchema>;
