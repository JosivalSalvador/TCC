"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { registerUserSchema } from "@/schemas/users.schema";
import { RegisterUserInput } from "@/types/index";
import { blurFadeIn, staggerContainer, slideUp } from "@/lib/animations/fade";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterUserInput>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(data: RegisterUserInput) {
    await register.mutateAsync(data);
  }

  const isPending = register.isPending;

  return (
    <Form {...form}>
      <motion.form
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <motion.div variants={blurFadeIn}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                  Usuário
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Seu Nome"
                    disabled={isPending}
                    className="bg-muted/20 border-border/50 focus-visible:ring-foreground h-11 rounded-md transition-all focus-visible:ring-1"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>

        <motion.div variants={blurFadeIn}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                  E-mail
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    disabled={isPending}
                    className="bg-muted/20 border-border/50 focus-visible:ring-foreground h-11 rounded-md transition-all focus-visible:ring-1"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>

        <motion.div variants={blurFadeIn}>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                  Senha Root
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      disabled={isPending}
                      className="bg-muted/20 border-border/50 focus-visible:ring-foreground h-11 rounded-md pr-10 transition-all focus-visible:ring-1"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                {/* A descrição da sua política de senha mantida e formatada */}
                <FormDescription className="text-muted-foreground/60 mt-2 font-mono text-[10px] uppercase">
                  Requisito: Mínimo de 8 caracteres alfanuméricos + Símbolo.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </motion.div>

        <motion.div variants={slideUp} className="pt-4">
          <Button
            type="submit"
            disabled={isPending}
            className="border-foreground bg-foreground text-background hover:bg-background hover:text-foreground group h-11 w-full rounded-md border font-medium shadow-[0_0_10px_rgba(250,250,250,0.05)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(250,250,250,0.15)]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Alocando...
              </>
            ) : (
              <>
                Registrar Acesso
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-2" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.form>
    </Form>
  );
}
