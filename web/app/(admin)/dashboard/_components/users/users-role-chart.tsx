"use client";

import { motion } from "framer-motion";
import { Role } from "@/types/enums";
import { blurFadeIn } from "@/lib/animations/fade";

interface RoleData {
  role: Role;
  count: number;
}

interface UsersRoleChartProps {
  byRole: RoleData[];
}

const roleColors: Record<Role, string> = {
  [Role.ADMIN]: "bg-primary",
  [Role.SUPPORTER]: "bg-blue-500",
  [Role.USER]: "bg-muted-foreground",
};

const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: "Admin",
  [Role.SUPPORTER]: "Supporter",
  [Role.USER]: "Usuário",
};

export function UsersRoleChart({ byRole }: UsersRoleChartProps) {
  const total = byRole.reduce((acc, item) => acc + item.count, 0);

  return (
    <motion.div
      variants={blurFadeIn}
      initial="hidden"
      animate="visible"
      className="glass-panel rounded-xl p-6"
    >
      <h3 className="text-foreground mb-6 font-semibold">Usuários por cargo</h3>

      <div className="flex flex-col gap-4">
        {byRole.map(({ role, count }) => {
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={role} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {roleLabels[role]}
                </span>
                <span className="text-foreground font-medium">
                  {count}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({percent}%)
                  </span>
                </span>
              </div>
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.6, ease: [0.25, 1, 0.35, 1] }}
                  className={`h-full rounded-full ${roleColors[role]}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
