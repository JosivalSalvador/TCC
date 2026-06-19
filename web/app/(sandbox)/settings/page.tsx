"use client";

import { motion } from "framer-motion";
import { ProfileForm } from "../_components/settings/profile-form";
import { PasswordForm } from "../_components/settings/password-form";
import { DangerZone } from "../_components/settings/danger-zone";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={blurFadeIn} className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie suas informações pessoais e segurança da conta.
          </p>
        </motion.div>

        {/* Perfil */}
        <motion.div variants={blurFadeIn}>
          <ProfileForm />
        </motion.div>

        {/* Senha */}
        <motion.div variants={blurFadeIn}>
          <PasswordForm />
        </motion.div>

        {/* Danger zone */}
        <motion.div variants={blurFadeIn}>
          <DangerZone />
        </motion.div>
      </motion.div>
    </div>
  );
}
