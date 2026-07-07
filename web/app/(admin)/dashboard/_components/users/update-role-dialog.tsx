"use client";

import { useState } from "react";
import { useUsersMutations } from "@/hooks/use-users";
import { UserResponse, UpdateRoleInput } from "@/types/index";
import { Role } from "@/types/enums";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateRoleSchema } from "@/schemas/users.schema";
import { Loader2, Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface UpdateRoleDialogProps {
  user: UserResponse;
}

export function UpdateRoleDialog({ user }: UpdateRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const { updateRole } = useUsersMutations();

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateRoleInput>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: { role: user.role as Role },
  });

  const onSubmit = (data: UpdateRoleInput) => {
    updateRole.mutate(
      { id: user.id, data },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Shield className="h-3.5 w-3.5" />
          Cargo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar cargo</DialogTitle>
          <DialogDescription>
            Alterando o cargo de{" "}
            <span className="text-foreground font-medium">{user.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Novo cargo</Label>
            <Select
              defaultValue={user.role}
              onValueChange={(value) =>
                setValue("role", value as Role, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.USER}>USER</SelectItem>
                <SelectItem value={Role.SUPPORTER}>SUPPORTER</SelectItem>
                <SelectItem value={Role.ADMIN}>ADMIN</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <span className="text-destructive text-xs">
                {errors.role.message}
              </span>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateRole.isPending}
              className="glow-primary"
            >
              {updateRole.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
