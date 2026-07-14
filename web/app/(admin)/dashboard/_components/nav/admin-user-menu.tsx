// nav/admin-user-menu.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-users";
import { LogOut, User, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminUserMenuProps {
  variant: "dock" | "badge";
  expanded: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AdminUserMenu({
  variant,
  expanded,
  onOpenChange,
}: AdminUserMenuProps) {
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

  const avatar = (
    <Avatar className="h-8 w-8 shrink-0 ring-1 ring-white/10">
      <AvatarFallback className="bg-linear-to-br from-[#ff6b5e]/20 to-[#8b5cf6]/20 text-xs font-semibold text-[#c4b5fd]">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  const menuContent = (
    <DropdownMenuContent
      align="end"
      side={variant === "dock" ? "right" : "bottom"}
      sideOffset={variant === "dock" ? 12 : 8}
      avoidCollisions
      className="w-52 border-white/10 bg-[#12121c]"
    >
      <div className="px-2 py-1.5">
        <p className="truncate text-sm font-medium text-[#f4f2fa]">
          {user?.name ?? "..."}
        </p>
        <p className="truncate text-xs text-[#9995b0]">
          {user?.email ?? "..."}
        </p>
      </div>
      <DropdownMenuSeparator className="bg-white/6" />
      <DropdownMenuItem asChild>
        <Link
          href="/dashboard/settings"
          className="flex cursor-pointer items-center gap-2"
        >
          <User className="h-4 w-4" />
          Configurações
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-white/6" />
      <DropdownMenuItem
        onClick={() => logout.mutate()}
        className="flex cursor-pointer items-center gap-2 text-[#ff6b5e] focus:text-[#ff6b5e]"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (variant === "badge") {
    return (
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger className="rounded-full p-0.5 outline-none">
          <div className="rounded-full bg-linear-to-br from-[#ff6b5e]/40 to-[#8b5cf6]/40 p-px shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
            <div
              className="rounded-full p-1 backdrop-blur-xl"
              style={{ backgroundColor: "rgba(13, 13, 20, 0.92)" }}
            >
              {avatar}
            </div>
          </div>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 outline-none hover:bg-white/5">
        {avatar}
        <div className="flex min-w-0 flex-1 items-center justify-between">
          <motion.span
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="truncate text-sm font-medium whitespace-nowrap text-[#f4f2fa]"
          >
            {user?.name?.split(" ")[0] ?? "..."}
          </motion.span>
          <motion.div
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#5f5b78]" />
          </motion.div>
        </div>
      </DropdownMenuTrigger>
      {menuContent}
    </DropdownMenu>
  );
}
