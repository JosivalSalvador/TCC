"use client";

import { motion } from "framer-motion";
import { UserResponse } from "@/types/index";
import { UpdateRoleDialog } from "./update-role-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { staggerContainer, staggerItem } from "@/lib/animations/fade";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Role } from "@/types/enums";

interface UsersTableProps {
  users: UserResponse[];
}

const roleBadgeStyle: Record<string, string> = {
  [Role.ADMIN]: "bg-primary/10 text-primary border-primary/30",
  [Role.SUPPORTER]: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  [Role.USER]: "bg-muted text-muted-foreground border-border",
};

export function UsersTable({ users }: UsersTableProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="glass-panel overflow-hidden rounded-xl"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Nome</TableHead>
            <TableHead className="text-muted-foreground">E-mail</TableHead>
            <TableHead className="text-muted-foreground">Cargo</TableHead>
            <TableHead className="text-muted-foreground">Criado em</TableHead>
            <TableHead className="text-muted-foreground text-right">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <motion.tr
              key={user.id}
              variants={staggerItem}
              className="border-border/50 hover:bg-accent/50 transition-colors"
            >
              <TableCell className="text-foreground font-medium">
                {user.name}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {user.email}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    roleBadgeStyle[user.role] ?? roleBadgeStyle[Role.USER]
                  }
                >
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {user.createdAt
                  ? new Intl.DateTimeFormat("pt-BR").format(
                      new Date(user.createdAt),
                    )
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <UpdateRoleDialog user={user} />
                  <DeleteUserDialog user={user} />
                </div>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
