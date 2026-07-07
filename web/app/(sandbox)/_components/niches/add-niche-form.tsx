"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, Loader2, Sparkles, Layers, X } from "lucide-react";
import {
  useAllNiches,
  useMyNiches,
  useNichesMutations,
} from "@/hooks/use-niches";
import { staggerContainer, staggerItem } from "@/lib/animations/fade";
import { cn } from "@/lib/utils/utils";
import { Label } from "@/components/ui/label";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

export function AddNicheForm() {
  const { data: allNichesData } = useAllNiches();
  const { data: myNichesData } = useMyNiches();
  const { addNiche } = useNichesMutations();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allNiches = useMemo(() => allNichesData?.niches ?? [], [allNichesData]);
  const myNicheIds = useMemo(
    () => new Set((myNichesData?.niches ?? []).map((n) => n.id)),
    [myNichesData],
  );

  const availableNiches = useMemo(
    () => allNiches.filter((n) => !myNicheIds.has(n.id)),
    [allNiches, myNicheIds],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const exactMatch = availableNiches.find(
    (n) => n.name.toLowerCase() === normalizedQuery,
  );

  const alreadyMineMatch = allNiches.find(
    (n) => n.name.toLowerCase() === normalizedQuery && myNicheIds.has(n.id),
  );

  const filteredNiches = useMemo(() => {
    if (!normalizedQuery) return availableNiches;
    return availableNiches.filter((n) =>
      n.name.toLowerCase().includes(normalizedQuery),
    );
  }, [availableNiches, normalizedQuery]);

  const canCreate =
    normalizedQuery.length >= 2 && !exactMatch && !alreadyMineMatch;

  const hasNiches = availableNiches.length > 0;
  const hasResults = filteredNiches.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setQuery("");
  };

  const handleSelectExisting = (name: string) => {
    addNiche.mutate({ name }, { onSuccess: closeSearch });
  };

  const handleCreateNew = () => {
    if (!canCreate) return;
    addNiche.mutate({ name: query.trim() }, { onSuccess: closeSearch });
  };

  let emptyMessage = "Nenhum nicho encontrado.";
  if (!hasNiches) {
    emptyMessage = "Você já vinculou todos os nichos disponíveis.";
  } else if (normalizedQuery.length > 0 && normalizedQuery.length < 2) {
    emptyMessage = "Digite ao menos 2 caracteres para criar um novo.";
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="glass-panel glow-border relative flex flex-col overflow-hidden rounded-xl"
    >
      {/* Brilho decorativo no topo */}
      <div
        aria-hidden
        className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b to-transparent"
      />

      <motion.div
        variants={staggerItem}
        ref={wrapperRef}
        className="relative flex flex-col gap-3 p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="badge-ai flex h-6 w-6 shrink-0 items-center justify-center rounded-lg">
              <Layers className="h-3.5 w-3.5" />
            </span>
            <Label className="text-foreground/90 text-xs font-semibold tracking-wide uppercase">
              Adicionar nicho
            </Label>
          </div>
          <span className="text-muted-foreground text-xs">
            {availableNiches.length} disponíveis
          </span>
        </div>
        <p className="text-muted-foreground -mt-1 text-xs leading-relaxed">
          Encontre um nicho já criado por outros usuários ou registre o seu.
        </p>

        <div className="relative flex flex-col gap-2">
          <div
            className={cn(
              "border-input flex h-11 items-center gap-2.5 rounded-lg border px-3.5 transition-colors",
              isSearchOpen && "border-primary/50 ring-primary/20 ring-2",
            )}
            style={{ backgroundColor: "#1c1c29" }}
          >
            <Search className="text-muted-foreground h-4 w-4 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar ou criar um nicho..."
              className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: smoothEase }}
                className="overflow-hidden"
              >
                <div
                  className="border-input flex max-h-52 flex-col gap-0.5 overflow-y-auto rounded-lg border p-1.5"
                  style={{ backgroundColor: "#1c1c29" }}
                >
                  {alreadyMineMatch && (
                    <div className="text-muted-foreground px-3 py-5 text-center text-sm">
                      Você já tem{" "}
                      <span className="text-foreground font-medium">
                        &quot;{alreadyMineMatch.name}&quot;
                      </span>{" "}
                      vinculado à sua conta.
                    </div>
                  )}

                  {!alreadyMineMatch && !hasResults && !canCreate && (
                    <div className="text-muted-foreground px-3 py-5 text-center text-sm">
                      {emptyMessage}
                    </div>
                  )}

                  {!alreadyMineMatch &&
                    hasResults &&
                    filteredNiches.map((niche) => (
                      <button
                        key={niche.id}
                        type="button"
                        onClick={() => handleSelectExisting(niche.name)}
                        disabled={addNiche.isPending}
                        className="group text-foreground flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
                      >
                        <span className="truncate">{niche.name}</span>
                        <Check className="text-primary h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}

                  {!alreadyMineMatch && canCreate && (
                    <>
                      {hasResults && (
                        <div className="border-border/60 my-2 border-t" />
                      )}
                      <button
                        type="button"
                        onClick={handleCreateNew}
                        disabled={addNiche.isPending}
                        className="bg-primary/10 hover:bg-primary/15 flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-50"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-[#a78bfa] to-[#7c3aed]">
                          {addNiche.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                          )}
                        </span>
                        <span className="text-primary">
                          Criar nicho{" "}
                          <span className="font-semibold">
                            &quot;{query.trim()}&quot;
                          </span>
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
