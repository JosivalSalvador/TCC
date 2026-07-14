// (admin)/dashboard/settings/page.tsx
"use client";

import { motion } from "framer-motion";
import { ProfileForm } from "@/app/(sandbox)/_components/settings/profile-form";
import { PasswordForm } from "@/app/(sandbox)/_components/settings/password-form";
import { DangerZone } from "@/app/(sandbox)/_components/settings/danger-zone";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/fade";

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto w-[90%] max-w-3xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8 py-10"
      >
        {/* Header */}
        <motion.div variants={blurFadeIn} className="flex flex-col gap-2">
          <h1 className="text-gradient text-3xl font-bold tracking-tight">
            Configurações
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Gerencie suas informações pessoais e a segurança da sua conta.
          </p>
        </motion.div>

        {/* Perfil */}
        <motion.div variants={staggerItem}>
          <ProfileForm />
        </motion.div>

        {/* Senha */}
        <motion.div variants={staggerItem}>
          <PasswordForm />
        </motion.div>

        {/* Separador antes da Danger Zone */}
        <motion.div
          variants={blurFadeIn}
          className="border-border/60 border-t"
        />

        {/* Danger zone */}
        <motion.div variants={staggerItem}>
          <DangerZone />
        </motion.div>
      </motion.div>
    </div>
  );
}
