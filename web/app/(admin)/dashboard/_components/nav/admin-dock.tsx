// nav/admin-dock.tsx
"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AdminUserMenu } from "./admin-user-menu";
import { AdminLogo } from "./admin-logo";
import { adminNavItems } from "./admin-nav-items";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

const desktopQuery = "(min-width: 1024px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(desktopQuery);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(desktopQuery).matches;
}

// null no server, true/false no client — sem setState manual em effect.
function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => null as boolean | null,
  );
}

function AdminDockItem({
  href,
  label,
  icon: Icon,
  active,
  expanded,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  expanded: boolean;
}) {
  return (
    <Link href={href} className="relative flex items-center">
      {active && (
        <motion.div
          layoutId="admin-dock-active-glow"
          transition={{ duration: 0.35, ease: smoothEase }}
          className="absolute inset-0 rounded-xl bg-linear-to-r from-[#ff6b5e]/20 to-[#8b5cf6]/20 shadow-[0_0_18px_rgba(139,92,246,0.35)]"
        />
      )}
      <div
        className={`relative z-10 flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 transition-colors ${
          active ? "text-[#f4f2fa]" : "text-[#9995b0] hover:text-[#f4f2fa]"
        }`}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        <motion.span
          animate={{
            width: expanded ? "auto" : 0,
            opacity: expanded ? 1 : 0,
          }}
          transition={{ duration: 0.25, ease: smoothEase }}
          className="overflow-hidden text-sm font-medium whitespace-nowrap"
        >
          {label}
        </motion.span>
      </div>
    </Link>
  );
}

export function AdminDock() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // Mantém expandido enquanto o UserDropdown estiver aberto, mesmo
  // que o mouse saia do aside pra alcançar o menu (portal, fora da árvore).
  const expanded = hovered || menuOpen;

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <>
      {/* Desktop: dock vertical flutuante, compacto, expande em overlay no hover */}
      <motion.aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={{ width: expanded ? 224 : 76 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="fixed top-6 bottom-6 left-6 z-50 hidden lg:flex"
      >
        <div className="relative flex w-full flex-col rounded-2xl bg-linear-to-b from-[#ff6b5e]/40 via-[#8b5cf6]/40 to-[#6366f1]/40 p-px shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div
            className="flex h-full w-full flex-col rounded-2xl px-3 py-5 backdrop-blur-xl"
            style={{ backgroundColor: "rgba(13, 13, 20, 0.92)" }}
          >
            <div className="mb-6">
              <AdminLogo expanded={expanded} />
            </div>

            <nav className="flex flex-1 flex-col gap-1">
              {adminNavItems.map((item) => (
                <AdminDockItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                  expanded={expanded}
                />
              ))}
            </nav>

            <div className="mt-3 border-t border-white/6 pt-3">
              {isDesktop && (
                <AdminUserMenu
                  variant="dock"
                  expanded={expanded}
                  onOpenChange={setMenuOpen}
                />
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Mobile: dock de navegação embaixo, só ícone */}
      <div className="fixed inset-x-4 bottom-4 z-50 lg:hidden">
        <div className="relative rounded-2xl bg-linear-to-r from-[#ff6b5e]/40 via-[#8b5cf6]/40 to-[#6366f1]/40 p-px shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div
            className="flex items-center justify-around rounded-2xl px-2 py-2 backdrop-blur-xl"
            style={{ backgroundColor: "rgba(13, 13, 20, 0.92)" }}
          >
            {adminNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2"
                >
                  {active && (
                    <motion.div
                      layoutId="admin-dock-active-glow-mobile"
                      transition={{ duration: 0.35, ease: smoothEase }}
                      className="absolute inset-0 rounded-xl bg-linear-to-r from-[#ff6b5e]/20 to-[#8b5cf6]/20"
                    />
                  )}
                  <item.icon
                    className={`relative z-10 h-4.5 w-4.5 ${
                      active ? "text-[#f4f2fa]" : "text-[#9995b0]"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: avatar solto, canto superior direito */}
      <div className="fixed top-4 right-4 z-50 lg:hidden">
        {isDesktop === false && (
          <AdminUserMenu variant="badge" expanded={false} />
        )}
      </div>
    </>
  );
}
