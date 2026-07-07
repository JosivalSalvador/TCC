"use client";

import React from "react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

// ==========================================
// FieldRow
// ==========================================

interface FieldRowProps {
  label: string;
  value: string;
}

export function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
        {label}
      </span>
      <span className="text-foreground text-sm leading-relaxed">{value}</span>
    </div>
  );
}

// ==========================================
// TagList
// ==========================================

interface TagListProps {
  label: string;
  items: string[];
}

export function TagList({ label, items }: TagListProps) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: smoothEase }}
            className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
          >
            {item}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// ExampleList
// ==========================================

interface ExampleListProps {
  items: string[];
}

export function ExampleList({ items }: ExampleListProps) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
        Exemplos
      </span>
      <ol className="flex list-none flex-col gap-1.5">
        {items.map((ex, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="badge-ai flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {i + 1}
            </span>
            <span className="text-foreground text-sm leading-relaxed italic">
              &ldquo;{ex}&rdquo;
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ==========================================
// ProportionBar
// Exibe uma proporção (0 a 1) como barra visual + percentual,
// usada em conjuntos como shorttail/midtail/longtail.
// ==========================================

interface ProportionBarProps {
  label: string;
  ratio: number;
  color?: string;
}

export function ProportionBar({
  label,
  ratio,
  color = "#8b5cf6",
}: ProportionBarProps) {
  const percent = Math.round(ratio * 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground font-mono">{percent}%</span>
      </div>
      <div className="bg-muted/60 h-1.5 w-full overflow-hidden rounded-full">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ==========================================
// MeterBar
// Variante de ProportionBar para medir um valor absoluto dentro de
// uma escala definida (ex: palavras/segundo entre 1 e 3), em vez de
// uma proporção normalizada. Rótulo e valor ficam acima da barra,
// e a barra ganha glow — usada quando o número em si é o destaque
// (ex: velocidade de fala), não uma fatia de um todo.
// ==========================================

interface MeterBarProps {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  color?: string;
}

export function MeterBar({
  label,
  value,
  displayValue,
  min,
  max,
  color = "#8b5cf6",
}: MeterBarProps) {
  const percent = Math.min(
    100,
    Math.max(0, ((value - min) / (max - min)) * 100),
  );

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono tracking-wider uppercase">
          {label}
        </span>
        <span className="text-foreground font-mono font-medium">
          {displayValue}
        </span>
      </div>
      <div className="bg-muted/60 relative h-1.5 w-full overflow-hidden rounded-full">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="glow-primary h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ==========================================
// StatusBadge
// Indicador binário compacto (presente/ausente, ativo/inativo),
// usado quando um dado da instrução se resume a um sim/não visual
// — ex: "CTA presente" vs "sem CTA explícito".
// ==========================================

interface StatusBadgeProps {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
}

export function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
  activeIcon,
  inactiveIcon,
}: StatusBadgeProps) {
  return (
    <div
      className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? activeIcon : inactiveIcon}
      {active ? activeLabel : inactiveLabel}
    </div>
  );
}

// ==========================================
// DotCounter
// Fileira de pontinhos representando uma contagem (ex: repetições
// sugeridas), com cap visual pra não estourar a linha em números altos.
// ==========================================

interface DotCounterProps {
  label: string;
  count: number;
  max?: number;
  color?: string;
}

export function DotCounter({
  label,
  count,
  max = 10,
  color = "#8b5cf6",
}: DotCounterProps) {
  const visibleCount = Math.min(count, max);
  const remainder = count - visibleCount;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
        {label}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: visibleCount }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: i * 0.04, ease: smoothEase }}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        ))}
        {remainder > 0 && (
          <span className="text-muted-foreground text-xs">+{remainder}</span>
        )}
      </div>
    </div>
  );
}

// ==========================================
// ConnectedPair
// Exibe um par de termos que co-ocorrem, com um conector visual
// entre eles (usado em vocabulario_geral.coocorrencias).
// ==========================================

interface ConnectedPairProps {
  terms: string[];
}

export function ConnectedPair({ terms }: ConnectedPairProps) {
  return (
    <div className="bg-primary/5 border-primary/20 flex items-center gap-2 rounded-lg border px-3 py-1.5">
      {terms.map((term, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-primary/50 text-xs">+</span>}
          <span className="text-foreground text-xs font-medium">{term}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ==========================================
// SectionBlock
// ==========================================

interface SectionBlockProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

export function SectionBlock({ icon, title, children }: SectionBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: smoothEase }}
      className="glass-panel flex flex-col gap-4 rounded-xl p-5"
    >
      <div className="flex items-center gap-2">
        <span className="badge-ai flex h-7 w-7 items-center justify-center rounded-lg">
          {icon}
        </span>
        <h4 className="text-foreground text-sm font-semibold">{title}</h4>
      </div>
      <Separator className="bg-border/40" />
      <div className="flex flex-col gap-3">{children}</div>
    </motion.div>
  );
}
