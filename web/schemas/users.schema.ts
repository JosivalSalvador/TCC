import { z } from "zod";
import { Role } from "../types/enums";

// =========================
// Email
// =========================

export const emailSchema = z
  .email({ message: "Formato de e-mail inválido" })
  .transform((value) => value.trim().toLowerCase());

// =========================
// Password
// =========================

const passwordSchema = z
  .string()
  .min(8, { message: "A senha deve ter no mínimo 8 caracteres" })
  .refine((value) => /[a-z]/.test(value), {
    message: "A senha deve conter ao menos uma letra minúscula",
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: "A senha deve conter ao menos uma letra maiúscula",
  })
  .refine((value) => /\d/.test(value), {
    message: "A senha deve conter ao menos um número",
  })
  .refine((value) => /[!@#$%^&*(),.?":{}|<>]/.test(value), {
    message: "A senha deve conter ao menos um caractere especial",
  });

// =========================
// Schema para Cadastro
// =========================

export const registerUserSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length >= 3, {
      message: "Nome deve ter no mínimo 3 caracteres",
    }),

  email: emailSchema,
  password: passwordSchema,
});

// ==========================================
// Schema para Atualizar Perfil (User/Admin)
// ==========================================
export const updateUserSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length >= 3, {
      message: "Nome deve ter no mínimo 3 caracteres",
    })
    .optional(),
  email: emailSchema.optional(),
});

// ==========================================
// Schema para Atualizar Cargo (Exclusivo Admin)
// ==========================================
export const updateRoleSchema = z.object({
  role: z.enum([Role.ADMIN, Role.SUPPORTER, Role.USER], {
    // Ajuste fino: Array explicito para o Zod entender o enum do Prisma perfeitamente na doc
    error: "Cargo inválido. Escolha entre ADMIN, SUPPORTER ou USER.",
  }),
});

// ==========================================
// Schema para Alterar Senha
// ==========================================
export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1, { message: "Senha antiga é obrigatória" }),
  newPassword: passwordSchema, // Reutiliza sua regra forte de senha
});

// ==========================================
// Schema de Resposta (Retorno da API)
// ==========================================
export const userResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: z.string(),
  createdAt: z.coerce.date().optional(),
});
