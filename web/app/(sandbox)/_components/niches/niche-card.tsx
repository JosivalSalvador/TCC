"use client";

import { motion } from "framer-motion";
import { Trash2, FolderOpen } from "lucide-react";
import { NicheResponse } from "@/types/index";
import { useNichesMutations } from "@/hooks/use-niches";
import { staggerItem } from "@/lib/animations/fade";
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

  return (
    <motion.div
      variants={staggerItem}
      className="glass-panel glow-border flex items-center justify-between rounded-xl px-5 py-4"
    >
      <div className="flex items-center gap-3">
        <div className="badge-ai flex h-8 w-8 items-center justify-center rounded-lg">
          <FolderOpen className="h-4 w-4" />
        </div>
        <span className="text-foreground text-sm font-medium">
          {niche.name}
        </span>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
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
