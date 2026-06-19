"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Loader2, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAllNiches } from "@/hooks/use-niches";
import { registerUserSchema } from "@/schemas/users.schema";
import { RegisterUserInput } from "@/types/index";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/fade";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

export function RegisterForm() {
  const { register: registerAuth } = useAuth();
  const { data: nichesData } = useAllNiches();

  const [nicheQuery, setNicheQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterUserInput>({
    resolver: zodResolver(registerUserSchema),
  });

  const niches = nichesData?.niches ?? [];

  const filtered =
    nicheQuery.trim().length === 0
      ? niches
      : niches.filter((n) =>
          n.name.toLowerCase().includes(nicheQuery.toLowerCase()),
        );

  const handleSelectNiche = (name: string) => {
    setSelectedNiche(name);
    setNicheQuery(name);
    setValue("nicheName", name, { shouldValidate: true });
    setIsDropdownOpen(false);
  };

  const handleNicheInput = (value: string) => {
    setNicheQuery(value);
    setSelectedNiche("");
    setValue("nicheName", value, { shouldValidate: true });
    setIsDropdownOpen(true);
  };

  const onSubmit = (data: RegisterUserInput) => {
    registerAuth.mutate(data);
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
        <h2 className="text-2xl font-bold tracking-tight">Crie sua conta</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Comece a gerar conteúdo viral em minutos
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Nome */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
            {...register("name")}
          />
          {errors.name && (
            <span className="text-destructive text-xs">
              {errors.name.message}
            </span>
          )}
        </motion.div>

        {/* Email */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <span className="text-destructive text-xs">
              {errors.email.message}
            </span>
          )}
        </motion.div>

        {/* Senha */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <span className="text-destructive text-xs">
              {errors.password.message}
            </span>
          )}
        </motion.div>

        {/* Nicho — Combobox */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="nicheName">Seu nicho</Label>
          <p className="text-muted-foreground text-xs">
            Selecione um existente ou digite para criar um novo
          </p>

          <div className="relative">
            <div className="relative">
              <Input
                id="nicheName"
                type="text"
                placeholder="Ex: tecnologia, culinária, finanças..."
                value={nicheQuery}
                onChange={(e) => handleNicheInput(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="absolute top-1/2 right-3 -translate-y-1/2"
              >
                <ChevronsUpDown className="text-muted-foreground h-4 w-4" />
              </button>
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="glass-panel absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md py-1 shadow-lg"
                >
                  {filtered.length > 0 ? (
                    filtered.map((niche) => (
                      <li
                        key={niche.id}
                        onClick={() => handleSelectNiche(niche.name)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors",
                          selectedNiche === niche.name
                            ? "text-primary bg-primary/10"
                            : "text-foreground hover:bg-accent",
                        )}
                      >
                        {niche.name}
                        {selectedNiche === niche.name && (
                          <Check className="text-primary h-3.5 w-3.5" />
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        Criar nicho{" "}
                      </span>
                      <span className="text-primary font-medium">
                        &quot{nicheQuery}&quot
                      </span>
                    </li>
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {errors.nicheName && (
            <span className="text-destructive text-xs">
              {errors.nicheName.message}
            </span>
          )}
        </motion.div>

        {/* Submit */}
        <motion.div variants={staggerItem}>
          <Button
            type="submit"
            disabled={registerAuth.isPending}
            className="glow-primary w-full"
          >
            {registerAuth.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Criar conta
              </>
            )}
          </Button>
        </motion.div>
      </form>

      {/* Link para login */}
      <motion.p
        variants={blurFadeIn}
        className="text-muted-foreground mt-6 text-center text-sm"
      >
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Entrar
        </Link>
      </motion.p>
    </motion.div>
  );
}
