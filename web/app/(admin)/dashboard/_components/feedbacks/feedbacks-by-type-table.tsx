"use client";

import { motion } from "framer-motion";
import { FeedbackType } from "@/types/enums";
import { blurFadeIn } from "@/lib/animations/fade";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FeedbackByType {
  type: FeedbackType;
  count: number;
  usefulCount: number;
  usefulPercent: number;
}

interface FeedbacksByTypeTableProps {
  byType: FeedbackByType[];
}

const typeLabels: Record<FeedbackType, string> = {
  [FeedbackType.STRUCTURE]: "Estrutura",
  [FeedbackType.SCRIPT]: "Roteiro",
};

export function FeedbacksByTypeTable({ byType }: FeedbacksByTypeTableProps) {
  return (
    <motion.div
      variants={blurFadeIn}
      initial="hidden"
      animate="visible"
      className="glass-panel overflow-hidden rounded-xl"
    >
      <div className="border-border/50 border-b px-6 py-4">
        <h3 className="text-foreground font-semibold">Feedbacks por tipo</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Tipo</TableHead>
            <TableHead className="text-muted-foreground">Total</TableHead>
            <TableHead className="text-muted-foreground">Úteis</TableHead>
            <TableHead className="text-muted-foreground">% Utilidade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {byType.map(({ type, count, usefulCount, usefulPercent }) => (
            <TableRow
              key={type}
              className="border-border/50 hover:bg-accent/50 transition-colors"
            >
              <TableCell className="text-foreground font-medium">
                {typeLabels[type]}
              </TableCell>
              <TableCell className="text-muted-foreground">{count}</TableCell>
              <TableCell className="text-muted-foreground">
                {usefulCount}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${usefulPercent}%` }}
                      transition={{ duration: 0.6, ease: [0.25, 1, 0.35, 1] }}
                      className="bg-primary h-full rounded-full"
                    />
                  </div>
                  <span className="text-foreground text-sm font-medium">
                    {usefulPercent}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
