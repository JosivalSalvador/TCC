"use client";

import { motion } from "framer-motion";
import { blurFadeIn } from "@/lib/animations/fade";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FeedbackByNiche {
  nicheId: string;
  nicheName: string;
  structure: {
    count: number;
    usefulCount: number;
    usefulPercent: number;
  };
  script: {
    count: number;
    usefulCount: number;
    usefulPercent: number;
  };
}

interface FeedbacksByNicheTableProps {
  byNiche: FeedbackByNiche[];
}

export function FeedbacksByNicheTable({ byNiche }: FeedbacksByNicheTableProps) {
  return (
    <motion.div
      variants={blurFadeIn}
      initial="hidden"
      animate="visible"
      className="glass-panel overflow-hidden rounded-xl"
    >
      <div className="border-border/50 border-b px-6 py-4">
        <h3 className="text-foreground font-semibold">Feedbacks por nicho</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Nicho</TableHead>
            <TableHead className="text-muted-foreground text-center">
              Estrutura
            </TableHead>
            <TableHead className="text-muted-foreground text-center">
              % Estrutura útil
            </TableHead>
            <TableHead className="text-muted-foreground text-center">
              Roteiro
            </TableHead>
            <TableHead className="text-muted-foreground text-center">
              % Roteiro útil
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {byNiche.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground py-8 text-center text-sm"
              >
                Nenhum feedback registrado ainda.
              </TableCell>
            </TableRow>
          ) : (
            byNiche.map(({ nicheId, nicheName, structure, script }) => (
              <TableRow
                key={nicheId}
                className="border-border/50 hover:bg-accent/50 transition-colors"
              >
                <TableCell className="text-foreground font-medium capitalize">
                  {nicheName}
                </TableCell>
                <TableCell className="text-muted-foreground text-center">
                  {structure.count}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${structure.usefulPercent}%` }}
                        transition={{ duration: 0.6, ease: [0.25, 1, 0.35, 1] }}
                        className="bg-primary h-full rounded-full"
                      />
                    </div>
                    <span className="text-foreground text-sm font-medium">
                      {structure.usefulPercent}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-center">
                  {script.count}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${script.usefulPercent}%` }}
                        transition={{ duration: 0.6, ease: [0.25, 1, 0.35, 1] }}
                        className="bg-primary h-full rounded-full"
                      />
                    </div>
                    <span className="text-foreground text-sm font-medium">
                      {script.usefulPercent}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </motion.div>
  );
}
