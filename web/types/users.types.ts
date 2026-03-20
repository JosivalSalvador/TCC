import { z } from "zod";
import {
  registerUserSchema,
  updateUserSchema,
  updateRoleSchema,
  updatePasswordSchema,
  userResponseSchema,
  emailSchema,
} from "../schemas/users.schema";

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

// Novos tipos:
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type email = z.infer<typeof emailSchema>;
