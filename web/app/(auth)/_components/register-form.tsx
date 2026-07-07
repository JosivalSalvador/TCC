"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Loader2,
  UserPlus,
  Check,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Plus,
  Search,
} from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils/utils";

// ==========================================
// Schema local (extend com confirmPassword)
// ==========================================

const registerFormSchema = registerUserSchema
  .extend({
    confirmPassword: z.string().min(1, { message: "Confirme sua senha" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormInput = z.infer<typeof registerFormSchema>;

// ==========================================
// Componente
// ==========================================

export function RegisterForm() {
  const { register: registerAuth } = useAuth();
  const { data: nichesData, isLoading: nichesLoading } = useAllNiches();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nichePopoverOpen, setNichePopoverOpen] = useState(false);
  const [nicheSearch, setNicheSearch] = useState("");
  const [selectedNicheLabel, setSelectedNicheLabel] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
  });

  const niches = nichesData?.niches ?? [];

  const filteredNiches =
    nicheSearch.trim().length === 0
      ? niches
      : niches.filter((n) =>
          n.name.toLowerCase().includes(nicheSearch.trim().toLowerCase()),
        );

  const isNewNiche =
    nicheSearch.trim().length > 0 &&
    !niches.some(
      (n) => n.name.toLowerCase() === nicheSearch.trim().toLowerCase(),
    );

  const handleSelectNiche = (name: string) => {
    setSelectedNicheLabel(name);
    setValue("nicheName", name, { shouldValidate: true });
    setNichePopoverOpen(false);
    setNicheSearch("");
  };

  const onSubmit = (data: RegisterFormInput) => {
    const payload: RegisterUserInput = {
      name: data.name,
      email: data.email,
      password: data.password,
      nicheName: data.nicheName,
    };
    registerAuth.mutate(payload);
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="w-full max-w-sm"
    >
      {/* Cabeçalho */}
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
          <div className="relative">
            <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              id="name"
              type="text"
              placeholder="Seu nome"
              autoComplete="name"
              className={cn(
                "pl-9",
                errors.name &&
                  "border-destructive focus-visible:ring-destructive",
              )}
              {...register("name")}
            />
          </div>
          {errors.name && (
            <span className="text-destructive text-xs">
              {errors.name.message}
            </span>
          )}
        </motion.div>

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
              className={cn(
                "pl-9",
                errors.email &&
                  "border-destructive focus-visible:ring-destructive",
              )}
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
              autoComplete="new-password"
              className={cn(
                "px-9",
                errors.password &&
                  "border-destructive focus-visible:ring-destructive",
              )}
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

        {/* Confirmar Senha */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <div className="relative">
            <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              className={cn(
                "px-9",
                errors.confirmPassword &&
                  "border-destructive focus-visible:ring-destructive",
              )}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
              tabIndex={-1}
              aria-label={
                showConfirmPassword ? "Ocultar senha" : "Mostrar senha"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="text-destructive text-xs">
              {errors.confirmPassword.message}
            </span>
          )}
        </motion.div>

        {/* Nicho — Popover + Command (shadcn) */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="nicheName">Nicho principal</Label>
          <p className="text-muted-foreground text-xs">
            Escolha um existente ou digite um nome para criar o seu
          </p>

          <Popover open={nichePopoverOpen} onOpenChange={setNichePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                id="nicheName"
                aria-expanded={nichePopoverOpen}
                className={cn(
                  "border-input bg-background flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-xs transition-colors",
                  "hover:border-ring/50 focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
                  !selectedNicheLabel && "text-muted-foreground",
                  errors.nicheName &&
                    "border-destructive focus-visible:ring-destructive",
                )}
              >
                <span className="truncate">
                  {selectedNicheLabel || "Buscar ou criar nicho..."}
                </span>
                <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
              </button>
            </PopoverTrigger>

            <PopoverContent
              className="p-0"
              style={{ width: "var(--radix-popover-trigger-width)" }}
              align="start"
              sideOffset={4}
            >
              <Command>
                <div className="flex items-center border-b px-3">
                  <Search className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
                  <CommandInput
                    placeholder="Buscar ou digitar novo nicho..."
                    value={nicheSearch}
                    onValueChange={setNicheSearch}
                    className="border-0 shadow-none focus-visible:ring-0"
                  />
                </div>

                <CommandList>
                  {nichesLoading && (
                    <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Carregando nichos...
                    </div>
                  )}

                  {!nichesLoading && (
                    <>
                      {/* Opção de criar novo nicho */}
                      {isNewNiche && (
                        <CommandGroup heading="Criar novo">
                          <CommandItem
                            value={`__new__${nicheSearch.trim()}`}
                            onSelect={() =>
                              handleSelectNiche(nicheSearch.trim())
                            }
                            className="gap-2"
                          >
                            <Plus className="text-primary h-3.5 w-3.5 shrink-0" />
                            <span>
                              Criar{" "}
                              <span className="text-foreground font-medium">
                                &quot;{nicheSearch.trim()}&quot;
                              </span>
                            </span>
                          </CommandItem>
                        </CommandGroup>
                      )}

                      {/* Separador entre criar e lista existente */}
                      {isNewNiche && filteredNiches.length > 0 && (
                        <CommandSeparator />
                      )}

                      {/* Nichos existentes */}
                      {filteredNiches.length > 0 && (
                        <CommandGroup heading="Nichos disponíveis">
                          {filteredNiches.map((niche) => (
                            <CommandItem
                              key={niche.id}
                              value={niche.name}
                              onSelect={() => handleSelectNiche(niche.name)}
                              className="justify-between"
                            >
                              {niche.name}
                              {selectedNicheLabel === niche.name && (
                                <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Estado vazio */}
                      <CommandEmpty>
                        Digite um nome para criar um nicho novo.
                      </CommandEmpty>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

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
