"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/types/enums";

interface UsersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  disabled?: boolean;
}

const roleFilterLabels: Record<string, string> = {
  ALL: "Todos os cargos",
  [Role.ADMIN]: "Admin",
  [Role.SUPPORTER]: "Supporter",
  [Role.USER]: "Usuário",
};

export function UsersToolbar({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  resultCount,
  totalCount,
  disabled = false,
}: UsersToolbarProps) {
  const hasActiveFilter = search.trim().length > 0 || roleFilter !== "ALL";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            disabled={disabled}
            className="pl-9"
          />
        </div>

        <Select
          value={roleFilter}
          onValueChange={onRoleFilterChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roleFilterLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onRoleFilterChange("ALL");
            }}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        {disabled
          ? "Carregando usuários..."
          : `${resultCount} de ${totalCount} usuário${totalCount === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
