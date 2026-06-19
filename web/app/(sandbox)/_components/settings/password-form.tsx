"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Loader2, KeyRound } from "lucide-react";
import { useUsersMutations } from "@/hooks/use-users";
import { updatePasswordSchema } from "@/schemas/users.schema";
import { UpdatePasswordInput } from "@/types/index";
import {
  staggerContainer,
  staggerItem,
  blurFadeIn,
} from "@/lib/animations/fade";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function PasswordForm() {
  const { changePassword } = useUsersMutations();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
  });

  const onSubmit = (data: UpdatePasswordInput) => {
    changePassword.mutate(data, {
      onSuccess: () => reset(),
    });
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="glass-panel rounded-xl p-6"
    >
      <motion.h3
        variants={blurFadeIn}
        className="text-foreground mb-6 font-semibold"
      >
        Alterar senha
      </motion.h3>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Senha atual */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="oldPassword">Senha atual</Label>
          <Input
            id="oldPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("oldPassword")}
          />
          {errors.oldPassword && (
            <span className="text-destructive text-xs">
              {errors.oldPassword.message}
            </span>
          )}
        </motion.div>

        {/* Nova senha */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword">Nova senha</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <span className="text-destructive text-xs">
              {errors.newPassword.message}
            </span>
          )}
        </motion.div>

        <motion.div variants={staggerItem}>
          <Button
            type="submit"
            disabled={changePassword.isPending}
            className="glow-primary"
          >
            {changePassword.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Alterar senha
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
