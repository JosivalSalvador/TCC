"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { Loader2, LogIn, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema } from "@/schemas/sessions.schema";
import { LoginInput } from "@/types/index";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/fade";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    login.mutate(data);
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="w-full max-w-sm"
    >
      {/* Header */}
      <motion.div variants={blurFadeIn} className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">
          Bem-vindo de volta
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Entre na sua conta para continuar criando
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Email */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              className="pl-9"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <span className="text-destructive text-xs">
              {errors.email.message}
            </span>
          )}
        </motion.div>

        {/* Senha */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="px-9"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <span className="text-destructive text-xs">
              {errors.password.message}
            </span>
          )}
        </motion.div>

        {/* Submit */}
        <motion.div variants={staggerItem}>
          <Button
            type="submit"
            disabled={login.isPending}
            className="glow-primary w-full"
          >
            {login.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Entrar
              </>
            )}
          </Button>
        </motion.div>
      </form>

      {/* Link para cadastro */}
      <motion.p
        variants={blurFadeIn}
        className="text-muted-foreground mt-6 text-center text-sm"
      >
        Não tem uma conta?{" "}
        <Link
          href="/register"
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Cadastre-se grátis
        </Link>
      </motion.p>
    </motion.div>
  );
}
