"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { useUsersMutations } from "@/hooks/use-users";
import { updatePasswordSchema } from "@/schemas/users.schema";
import { UpdatePasswordInput } from "@/types/index";
import {
  staggerContainer,
  staggerItem,
  blurFadeIn,
  hoverScale,
  tapScale,
} from "@/lib/animations/fade";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

export function PasswordForm() {
  const { changePassword } = useUsersMutations();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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
      onSuccess: () => {
        reset();
        setShowOldPassword(false);
        setShowNewPassword(false);
      },
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
          <div className="relative">
            <Input
              id="oldPassword"
              type={showOldPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-10"
              {...register("oldPassword")}
            />
            <button
              type="button"
              onClick={() => setShowOldPassword((prev) => !prev)}
              tabIndex={-1}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {showOldPassword ? (
                  <motion.span
                    key="eye-off"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <EyeOff className="h-4 w-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="eye"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <Eye className="h-4 w-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
          {errors.oldPassword && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-xs"
            >
              {errors.oldPassword.message}
            </motion.span>
          )}
        </motion.div>

        {/* Nova senha */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword">Nova senha</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pr-10"
              {...register("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              tabIndex={-1}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {showNewPassword ? (
                  <motion.span
                    key="eye-off"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <EyeOff className="h-4 w-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="eye"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="block"
                  >
                    <Eye className="h-4 w-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
          {errors.newPassword && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-xs"
            >
              {errors.newPassword.message}
            </motion.span>
          )}
        </motion.div>

        <motion.div variants={staggerItem}>
          <motion.div
            whileHover={!changePassword.isPending ? hoverScale : undefined}
            whileTap={!changePassword.isPending ? tapScale : undefined}
          >
            <Button
              type="submit"
              disabled={changePassword.isPending}
              className={cn(
                "transition-shadow duration-300",
                !changePassword.isPending && "glow-primary",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {changePassword.isPending ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Alterando...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    Alterar senha
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </motion.div>
      </form>
    </motion.div>
  );
}
