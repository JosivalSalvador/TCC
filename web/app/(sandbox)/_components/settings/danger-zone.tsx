"use client";

import { motion } from "framer-motion";
import { Trash2, Loader2, ShieldAlert } from "lucide-react";
import { useUsersMutations } from "@/hooks/use-users";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
  hoverScale,
  tapScale,
} from "@/lib/animations/fade";
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
import { Button } from "@/components/ui/button";

export function DangerZone() {
  const { deleteAccount } = useUsersMutations();

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="border-destructive/30 bg-destructive/5 rounded-xl border p-6"
    >
      <motion.div
        variants={blurFadeIn}
        className="mb-1 flex items-center gap-2"
      >
        <ShieldAlert className="text-destructive h-4 w-4" />
        <h3 className="text-destructive font-semibold">Zona de perigo</h3>
      </motion.div>

      <motion.p
        variants={blurFadeIn}
        className="text-muted-foreground mb-6 text-sm leading-relaxed"
      >
        Ao excluir sua conta, todos os seus dados serão desativados
        permanentemente. Suas gerações e histórico serão preservados para fins
        de estatísticas, mas você não terá mais acesso a eles.
      </motion.p>

      <motion.div variants={staggerItem}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <motion.div
              className="inline-block"
              whileHover={!deleteAccount.isPending ? hoverScale : undefined}
              whileTap={!deleteAccount.isPending ? tapScale : undefined}
            >
              <Button variant="destructive" disabled={deleteAccount.isPending}>
                {deleteAccount.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Excluir minha conta
                  </>
                )}
              </Button>
            </motion.div>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border text-foreground border shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlert className="text-destructive h-5 w-5" />
                Excluir conta
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Tem certeza que deseja excluir sua conta? Essa ação não pode ser
                desfeita. Você perderá acesso a todas as suas gerações e
                favoritos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAccount.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, excluir minha conta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </motion.div>
  );
}
