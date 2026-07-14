"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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

export type UserSortKey = "name" | "email" | "role" | "createdAt";
export type SortDirection = "asc" | "desc";

interface UsersTableProps {
  users: UserResponse[];
  sortKey: UserSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: UserSortKey) => void;
}

const roleBadgeStyle: Record<string, string> = {
  [Role.ADMIN]: "bg-primary/10 text-primary border-primary/30",
  [Role.SUPPORTER]: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  [Role.USER]: "bg-muted text-muted-foreground border-border",
};

const sortableColumns: { key: UserSortKey; label: string }[] = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "role", label: "Cargo" },
  { key: "createdAt", label: "Criado em" },
];

export function UsersTable({
  users,
  sortKey,
  sortDirection,
  onSortChange,
}: UsersTableProps) {
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
            {sortableColumns.map(({ key, label }) => {
              const isActive = sortKey === key;

              return (
                <TableHead key={key} className="text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => onSortChange(key)}
                    className="hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {label}
                    {isActive ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                </TableHead>
              );
            })}
            <TableHead className="text-muted-foreground text-right">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={5}
                className="text-muted-foreground py-10 text-center text-sm"
              >
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
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
            ))
          )}
        </TableBody>
      </Table>
    </motion.div>
  );
}
