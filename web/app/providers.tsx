"use client";

import { useState, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/query-client";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";

/**
 * Componente Global de Providers
 * Envolve a aplicação para fornecer QueryClient, Acessibilidade de Animação e Notificações (Sonner)
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {/* Respeita a preferência de redução de movimento do Sistema Operacional */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>

      {/* Toaster tunado para o visual Terminal/Brutalista */}
      <Toaster
        richColors
        closeButton
        position="bottom-right"
        theme="dark" // Travado no dark mode
        toastOptions={{
          // Força as bordas retas e a fonte tech nas notificações
          className:
            "rounded-none border-border/50 bg-background text-foreground font-mono shadow-xl",
        }}
      />
    </QueryClientProvider>
  );
}
