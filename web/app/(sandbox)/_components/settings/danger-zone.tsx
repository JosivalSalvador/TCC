"use client";

import { motion } from "framer-motion";
import { Trash2, Loader2 } from "lucide-react";
import { useUsersMutations } from "@/hooks/use-users";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
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
      <motion.h3
        variants={blurFadeIn}
        className="text-destructive mb-1 font-semibold"
      >
        Zona de perigo
      </motion.h3>

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
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir conta</AlertDialogTitle>
              <AlertDialogDescription>
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
