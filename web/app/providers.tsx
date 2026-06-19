"use client";

import { useState, ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/query-client";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>

      <Toaster
        richColors
        closeButton
        position="bottom-right"
        theme="dark"
        toastOptions={{
          className:
            "rounded-md border-border/50 bg-card text-foreground shadow-xl",
        }}
      />
    </QueryClientProvider>
  );
}
