"use client";

import { motion } from "framer-motion";
import { NicheResponse } from "@/types/index";
import { staggerContainer, staggerItem } from "@/lib/animations/fade";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NichesTableProps {
  niches: NicheResponse[];
}

export function NichesTable({ niches }: NichesTableProps) {
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
            <TableHead className="text-muted-foreground">Nome</TableHead>
            <TableHead className="text-muted-foreground">Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {niches.map((niche) => (
            <motion.tr
              key={niche.id}
              variants={staggerItem}
              className="border-border/50 hover:bg-accent/50 transition-colors"
            >
              <TableCell className="text-foreground font-medium">
                {niche.name}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {niche.createdAt
                  ? new Intl.DateTimeFormat("pt-BR").format(
                      new Date(niche.createdAt),
                    )
                  : "—"}
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
