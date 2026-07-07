"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Save, CheckCircle2, PenLine } from "lucide-react";
import { useProfile, useUsersMutations } from "@/hooks/use-users";
import { updateUserSchema } from "@/schemas/users.schema";
import { UpdateUserInput } from "@/types/index";
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

export function ProfileForm() {
  const { data } = useProfile();
  const { updateProfile } = useUsersMutations();
  const [justSaved, setJustSaved] = useState(false);

  const user = data?.user;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    values: {
      name: user?.name ?? "",
      email: user?.email ?? "",
    },
  });

  const onSubmit = (data: UpdateUserInput) => {
    updateProfile.mutate(data, {
      onSuccess: () => {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
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
      <div className="mb-6 flex items-center justify-between">
        <motion.h3
          variants={blurFadeIn}
          className="text-foreground font-semibold"
        >
          Informações do perfil
        </motion.h3>

        <AnimatePresence mode="wait">
          {justSaved ? (
            <motion.span
              key="saved"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="text-success flex items-center gap-1.5 text-xs font-medium"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Salvo
            </motion.span>
          ) : isDirty ? (
            <motion.span
              key="dirty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="badge-ai flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            >
              <PenLine className="h-3 w-3" />
              Alterações não salvas
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Nome */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="flex items-center gap-1.5">
            Nome
            {dirtyFields.name && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary h-1.5 w-1.5 rounded-full"
              />
            )}
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
            className={cn(
              "transition-colors duration-300",
              dirtyFields.name && "border-primary/50",
            )}
            {...register("name")}
          />
          {errors.name && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-xs"
            >
              {errors.name.message}
            </motion.span>
          )}
        </motion.div>

        {/* Email */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="flex items-center gap-1.5">
            E-mail
            {dirtyFields.email && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary h-1.5 w-1.5 rounded-full"
              />
            )}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            className={cn(
              "transition-colors duration-300",
              dirtyFields.email && "border-primary/50",
            )}
            {...register("email")}
          />
          {errors.email && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-destructive text-xs"
            >
              {errors.email.message}
            </motion.span>
          )}
        </motion.div>

        <motion.div variants={staggerItem}>
          <motion.div
            whileHover={
              isDirty && !updateProfile.isPending ? hoverScale : undefined
            }
            whileTap={
              isDirty && !updateProfile.isPending ? tapScale : undefined
            }
          >
            <Button
              type="submit"
              disabled={!isDirty || updateProfile.isPending}
              className={cn(
                "transition-shadow duration-300",
                isDirty && !updateProfile.isPending && "glow-primary",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {updateProfile.isPending ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Salvar alterações
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
