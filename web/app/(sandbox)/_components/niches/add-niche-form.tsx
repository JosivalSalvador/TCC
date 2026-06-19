"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { useAllNiches, useNichesMutations } from "@/hooks/use-niches";
import { staggerContainer, staggerItem } from "@/lib/animations/fade";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

export function AddNicheForm() {
  const { data: nichesData } = useAllNiches();
  const { addNiche } = useNichesMutations();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const niches = nichesData?.niches ?? [];

  const filtered =
    query.trim().length === 0
      ? niches
      : niches.filter((n) =>
          n.name.toLowerCase().includes(query.toLowerCase()),
        );

  const handleSelect = (name: string) => {
    setSelected(name);
    setQuery(name);
    setIsOpen(false);
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    addNiche.mutate(
      { name: query.trim() },
      {
        onSuccess: () => {
          setQuery("");
          setSelected("");
        },
      },
    );
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="glass-panel rounded-xl p-6"
    >
      <motion.h3
        variants={staggerItem}
        className="text-foreground mb-4 font-semibold"
      >
        Adicionar nicho
      </motion.h3>

      <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
        <Label>Nome do nicho</Label>
        <p className="text-muted-foreground text-xs">
          Selecione um existente ou digite para criar um novo
        </p>

        <div className="relative mt-1">
          <div className="relative">
            <Input
              type="text"
              placeholder="Ex: tecnologia, culinária, finanças..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected("");
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="absolute top-1/2 right-3 -translate-y-1/2"
            >
              <ChevronsUpDown className="text-muted-foreground h-4 w-4" />
            </button>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="glass-panel absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md py-1 shadow-lg"
              >
                {filtered.length > 0 ? (
                  filtered.map((niche) => (
                    <li
                      key={niche.id}
                      onClick={() => handleSelect(niche.name)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors",
                        selected === niche.name
                          ? "text-primary bg-primary/10"
                          : "text-foreground hover:bg-accent",
                      )}
                    >
                      {niche.name}
                      {selected === niche.name && (
                        <Check className="text-primary h-3.5 w-3.5" />
                      )}
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Criar nicho </span>
                    <span className="text-primary font-medium">
                      &quot;{query}&quot;
                    </span>
                  </li>
                )}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="mt-4">
        <Button
          onClick={handleSubmit}
          disabled={!query.trim() || addNiche.isPending}
          className="glow-primary w-full"
        >
          {addNiche.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Adicionar nicho
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
