"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { useProfile, useUsersMutations } from "@/hooks/use-users";
import { updateUserSchema } from "@/schemas/users.schema";
import { UpdateUserInput } from "@/types/index";
import {
  staggerContainer,
  staggerItem,
  blurFadeIn,
} from "@/lib/animations/fade";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ProfileForm() {
  const { data } = useProfile();
  const { updateProfile } = useUsersMutations();

  const user = data?.user;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    values: {
      name: user?.name ?? "",
      email: user?.email ?? "",
    },
  });

  const onSubmit = (data: UpdateUserInput) => {
    updateProfile.mutate(data);
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
        Informações do perfil
      </motion.h3>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Nome */}
        <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome"
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
            {...register("email")}
          />
          {errors.email && (
            <span className="text-destructive text-xs">
              {errors.email.message}
            </span>
          )}
        </motion.div>

        <motion.div variants={staggerItem}>
          <Button
            type="submit"
            disabled={updateProfile.isPending}
            className="glow-primary"
          >
            {updateProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar alterações
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
