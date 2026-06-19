"use client";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-users";
import { LogOut, User, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function UserDropdown() {
  const { logout } = useAuth();
  const { data } = useProfile();

  const user = data?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors outline-none">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-foreground max-w-30 truncate text-sm font-medium">
          {user?.name ?? "..."}
        </span>
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-foreground truncate text-sm font-medium">
            {user?.name ?? "..."}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {user?.email ?? "..."}
          </p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href="/settings"
            className="flex cursor-pointer items-center gap-2"
          >
            <User className="h-4 w-4" />
            Configurações
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => logout.mutate()}
          className="text-destructive focus:text-destructive flex cursor-pointer items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
