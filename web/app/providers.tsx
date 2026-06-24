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
        closeButton
        position="bottom-right"
        theme="dark"
        toastOptions={{
          classNames: {
            toast:
              "!bg-[#12121c] !border !border-[#2a2a3d] !text-[#f0f0f8] !shadow-xl !rounded-lg !font-sans",
            title: "!text-sm !font-medium",
            description: "!text-xs !text-[#8b8ba8]",
            success: "!border-[#7c3aed]/30 [&>[data-icon]]:!text-[#a78bfa]",
            error: "!border-[#ef4444]/30 [&>[data-icon]]:!text-[#ef4444]",
          },
        }}
      />
    </QueryClientProvider>
  );
}
