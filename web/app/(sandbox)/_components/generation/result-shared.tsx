"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";

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
          <span
            key={i}
            className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
          >
            {item}
          </span>
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
// SectionBlock
// ==========================================

interface SectionBlockProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

export function SectionBlock({ icon, title, children }: SectionBlockProps) {
  return (
    <div className="glass-panel flex flex-col gap-4 rounded-xl p-5">
      <div className="flex items-center gap-2">
        <span className="badge-ai flex h-7 w-7 items-center justify-center rounded-lg">
          {icon}
        </span>
        <h4 className="text-foreground text-sm font-semibold">{title}</h4>
      </div>
      <Separator className="bg-border/40" />
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
