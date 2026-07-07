"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Search,
  Check,
  ArrowRight,
  X,
  Users,
  Compass,
} from "lucide-react";
import { useMyNiches } from "@/hooks/use-niches";
import { createGenerationSchema } from "@/schemas/generations.schema";
import { CreateGenerationInput, GenerationResponse } from "@/types/index";
import type { useGenerationsMutations } from "@/hooks/use-generations";
import { staggerContainer, staggerItem } from "@/lib/animations/fade";
import { cn } from "@/lib/utils/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

interface GenerationFormProps {
  onSuccess: (generation: GenerationResponse) => void;
  createGeneration: ReturnType<
    typeof useGenerationsMutations
  >["createGeneration"];
}

// ==========================================
// Indicador de etapas
// ==========================================

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { number: 1, label: "Nicho" },
    { number: 2, label: "Público" },
    { number: 3, label: "Gerar" },
  ];

  return (
    <div className="flex items-center px-5 pt-5">
      {steps.map((step, i) => {
        const isDone = currentStep > step.number;
        const isActive = currentStep === step.number;
        const isLast = i === steps.length - 1;

        return (
          <div
            key={step.number}
            className={cn("flex items-center", !isLast && "flex-1")}
          >
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.3, ease: smoothEase }}
                className={cn(
                  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                  isDone && "bg-primary border-primary text-white",
                  isActive &&
                    !isDone &&
                    "border-primary bg-primary/15 text-primary",
                  !isActive &&
                    !isDone &&
                    "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {isActive && (
                  <motion.span
                    animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.4, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: smoothEase,
                    }}
                    className="bg-primary/40 absolute inset-0 rounded-full"
                  />
                )}
                {isDone ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <span className="relative">{step.number}</span>
                )}
              </motion.div>
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-wide uppercase transition-colors",
                  isActive || isDone
                    ? "text-foreground"
                    : "text-muted-foreground/70",
                )}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div className="bg-border relative mx-2 h-px flex-1 -translate-y-3.5 overflow-hidden rounded-full">
                <motion.div
                  initial={false}
                  animate={{ width: isDone ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: smoothEase }}
                  className="bg-primary absolute inset-y-0 left-0"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function GenerationForm({
  onSuccess,
  createGeneration,
}: GenerationFormProps) {
  const { data: nichesData } = useMyNiches();

  const niches = useMemo(() => nichesData?.niches ?? [], [nichesData]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateGenerationInput>({
    resolver: zodResolver(createGenerationSchema),
  });

  const selectedNicheId = useWatch({ control, name: "nicheId" });
  const audienceValue = useWatch({ control, name: "audienceCountry" });
  const selectedNiche = niches.find((n) => n.id === selectedNicheId);

  const filteredNiches = useMemo(() => {
    if (!query.trim()) return niches;
    const q = query.trim().toLowerCase();
    return niches.filter((n) => n.name.toLowerCase().includes(q));
  }, [niches, query]);

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

  const handleSelectNiche = (id: string) => {
    setValue("nicheId", id, { shouldValidate: true });
    setIsSearchOpen(false);
    setQuery("");
  };

  const onSubmit = (data: CreateGenerationInput) => {
    createGeneration.mutate(data, {
      onSuccess: (response: { data?: { generation: GenerationResponse } }) => {
        if (response.data?.generation) {
          onSuccess(response.data.generation);
        }
      },
    });
  };

  const hasNiches = niches.length > 0;
  const hasResults = filteredNiches.length > 0;
  const hasAudience = !!audienceValue?.trim();

  // Etapa atual, derivada do progresso real do usuário
  let currentStep: 1 | 2 | 3 = 1;
  if (selectedNiche && !hasAudience) currentStep = 2;
  if (selectedNiche && hasAudience) currentStep = 3;

  let emptyMessage = "Nenhum nicho encontrado.";
  if (!hasNiches) {
    emptyMessage = "Nenhum nicho vinculado.";
  }

  return (
    <motion.form
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit(onSubmit)}
      className="glass-panel glow-border relative flex flex-col gap-0 overflow-hidden rounded-xl"
    >
      {/* Brilho decorativo no topo */}
      <div
        aria-hidden
        className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b to-transparent"
      />

      <motion.div variants={staggerItem} className="relative">
        <StepIndicator currentStep={currentStep} />
      </motion.div>

      {/* ========================================== */}
      {/* Etapa 1 — Nicho */}
      {/* ========================================== */}
      <motion.div
        variants={staggerItem}
        ref={wrapperRef}
        className="border-border/60 relative flex flex-col gap-3 border-b p-5"
      >
        <span
          aria-hidden
          className="text-border/50 pointer-events-none absolute top-2 right-4 font-mono text-5xl font-black select-none"
        >
          01
        </span>

        <div className="flex items-center gap-2">
          <span className="badge-ai flex h-6 w-6 shrink-0 items-center justify-center rounded-lg">
            <Compass className="h-3.5 w-3.5" />
          </span>
          <Label className="text-foreground/90 text-xs font-semibold tracking-wide uppercase">
            Escolha o nicho
          </Label>
        </div>
        <p className="text-muted-foreground -mt-1 text-xs leading-relaxed">
          Selecione um dos nichos já vinculados à sua conta.
        </p>

        {selectedNiche && !isSearchOpen ? (
          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            type="button"
            onClick={() => {
              setIsSearchOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="group border-primary/40 bg-primary/10 hover:border-primary/60 hover:shadow-primary/10 relative flex items-center justify-between rounded-lg border px-3.5 py-3 text-left shadow-lg transition-all"
          >
            <span className="flex items-center gap-2.5">
              <span className="bg-primary glow-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
              <span className="text-foreground text-sm font-medium">
                {selectedNiche.name}
              </span>
            </span>
            <span className="text-primary/70 text-xs opacity-0 transition-opacity group-hover:opacity-100">
              Trocar
            </span>
          </motion.button>
        ) : (
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
                placeholder="Buscar nicho..."
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
                    {!hasResults && (
                      <div className="text-muted-foreground px-3 py-5 text-center text-sm">
                        {emptyMessage}
                        {!hasNiches && (
                          <a
                            href="/niches"
                            className="text-primary ml-1 hover:underline"
                          >
                            Adicionar nicho
                          </a>
                        )}
                      </div>
                    )}

                    {hasResults &&
                      filteredNiches.map((niche) => {
                        const isSelected = niche.id === selectedNicheId;
                        return (
                          <button
                            key={niche.id}
                            type="button"
                            onClick={() => handleSelectNiche(niche.id)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                              isSelected
                                ? "bg-primary/15 text-primary"
                                : "text-foreground hover:bg-white/5",
                            )}
                          >
                            <span className="truncate">{niche.name}</span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {errors.nicheId && (
          <span className="text-destructive text-xs">
            {errors.nicheId.message}
          </span>
        )}
      </motion.div>

      {/* ========================================== */}
      {/* Etapa 2 — Público */}
      {/* ========================================== */}
      <motion.div
        variants={staggerItem}
        className="border-border/60 relative flex flex-col gap-2 border-b p-5"
      >
        <span
          aria-hidden
          className="text-border/50 pointer-events-none absolute top-2 right-4 font-mono text-5xl font-black select-none"
        >
          02
        </span>

        <div className="flex items-center gap-2">
          <span className="badge-ai flex h-6 w-6 shrink-0 items-center justify-center rounded-lg">
            <Users className="h-3.5 w-3.5" />
          </span>
          <Label className="text-foreground/90 text-xs font-semibold tracking-wide uppercase">
            Informe o público-alvo{" "}
            <span className="text-muted-foreground font-normal normal-case">
              (opcional)
            </span>
          </Label>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Se quiser, diz quem é o seu público. O guia se ajusta pra esse
          contexto.
        </p>
        <Textarea
          onChange={(e) =>
            setValue("audienceCountry", e.target.value, {
              shouldValidate: true,
            })
          }
          placeholder="ex: mulheres de 25 a 35 anos começando a investir, iniciantes em programação, pais de primeira viagem..."
          rows={3}
          className={cn(
            "border-input resize-none transition-shadow",
            hasAudience && "border-primary/40 shadow-primary/5 shadow-md",
          )}
          style={{ backgroundColor: "#1c1c29" }}
        />
      </motion.div>

      {/* ========================================== */}
      {/* Etapa 3 — Resumo e ação */}
      {/* ========================================== */}
      <motion.div
        variants={staggerItem}
        className="relative flex flex-col gap-4 p-5"
      >
        <span
          aria-hidden
          className="text-border/50 pointer-events-none absolute top-2 right-4 font-mono text-5xl font-black select-none"
        >
          03
        </span>

        <p className="text-xs leading-relaxed">
          <span className="text-muted-foreground">Vai gerar sobre </span>
          <span
            className={cn(
              "font-semibold",
              selectedNiche
                ? "text-gradient"
                : "text-muted-foreground/60 italic",
            )}
          >
            {selectedNiche ? selectedNiche.name : "um nicho a definir"}
          </span>
          <span className="text-muted-foreground"> para </span>
          <span
            className={cn(
              "font-semibold",
              hasAudience ? "text-gradient" : "text-muted-foreground/60 italic",
            )}
          >
            {hasAudience ? audienceValue!.trim() : "público geral"}
          </span>
          <span className="text-muted-foreground">.</span>
        </p>

        <Button
          type="submit"
          disabled={createGeneration.isPending}
          className={cn(
            "group relative h-12 w-full overflow-hidden text-sm font-semibold shadow-lg transition-all",
            "bg-linear-to-r from-[#7c3aed] via-[#8b5cf6] to-[#6366f1]",
            "hover:shadow-primary/40 hover:scale-[1.01] hover:shadow-xl",
            "disabled:hover:scale-100",
          )}
        >
          {/* Brilho que percorre o botão */}
          {!createGeneration.isPending && (
            <motion.span
              aria-hidden
              animate={{ x: ["-120%", "220%"] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 1,
              }}
              className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/20"
            />
          )}

          {createGeneration.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando conteúdo...
            </span>
          ) : (
            <span className="relative flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              Gerar conteúdo
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          )}
        </Button>
      </motion.div>
    </motion.form>
  );
}
