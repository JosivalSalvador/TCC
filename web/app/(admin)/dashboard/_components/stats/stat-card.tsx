"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { staggerItem } from "@/lib/animations/fade";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  description?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: StatCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="glass-panel glow-border flex flex-col gap-3 rounded-xl p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{label}</span>
        <div className="badge-ai flex h-7 w-7 items-center justify-center rounded-md">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <span className="text-3xl font-bold">{value}</span>

      {description && (
        <span className="text-muted-foreground text-xs">{description}</span>
      )}
    </motion.div>
  );
}
