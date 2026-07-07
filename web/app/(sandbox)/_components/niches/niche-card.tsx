"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2, FolderOpen, Loader2 } from "lucide-react";
import { NicheResponse } from "@/types/index";
import { useNichesMutations } from "@/hooks/use-niches";
import { staggerItem, hoverScale } from "@/lib/animations/fade";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NicheCardProps {
  niche: NicheResponse;
}

export function NicheCard({ niche }: NicheCardProps) {
  const { removeNiche } = useNichesMutations();

  const isRemovingThis =
    removeNiche.isPending && removeNiche.variables === niche.id;

  return (
    <motion.div
      variants={staggerItem}
      layout
      exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
      whileHover={hoverScale}
      className="glass-panel glow-border flex items-center justify-between rounded-xl px-5 py-4"
    >
      <div className="flex items-center gap-3">
        <motion.div
          whileHover={{ rotate: -8, scale: 1.08 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="badge-ai flex h-8 w-8 items-center justify-center rounded-lg"
        >
          <FolderOpen className="h-4 w-4" />
        </motion.div>
        <span className="text-foreground text-sm font-medium">
          {niche.name}
        </span>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 0.3 }}
            disabled={isRemovingThis}
            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isRemovingThis ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="block"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="block"
                >
                  <Trash2 className="h-4 w-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover nicho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o nicho{" "}
              <span className="text-foreground font-medium">
                &quot;{niche.name}&quot;
              </span>{" "}
              da sua conta? Suas gerações anteriores não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeNiche.mutate(niche.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
