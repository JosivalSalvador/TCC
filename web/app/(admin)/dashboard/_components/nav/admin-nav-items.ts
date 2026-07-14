// nav/admin-nav-items.ts
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Sparkles,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const adminNavItems: AdminNavItem[] = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Usuários", icon: Users },
  { href: "/dashboard/niches", label: "Nichos", icon: FolderOpen },
  { href: "/dashboard/generations", label: "Gerações", icon: Sparkles },
  { href: "/dashboard/feedbacks", label: "Feedbacks", icon: MessageSquare },
];
