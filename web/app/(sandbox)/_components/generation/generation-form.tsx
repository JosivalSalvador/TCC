"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { useMyNiches } from "@/hooks/use-niches";
import { useGenerationsMutations } from "@/hooks/use-generations";
import { createGenerationSchema } from "@/schemas/generations.schema";
import { CreateGenerationInput, GenerationResponse } from "@/types/index";
import { staggerContainer, staggerItem } from "@/lib/animations/fade";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const countries = [
  { value: "brasil", label: "🇧🇷 Brasil" },
  { value: "portugal", label: "🇵🇹 Portugal" },
  { value: "estados_unidos", label: "🇺🇸 Estados Unidos" },
  { value: "argentina", label: "🇦🇷 Argentina" },
  { value: "mexico", label: "🇲🇽 México" },
  { value: "espanha", label: "🇪🇸 Espanha" },
];

interface GenerationFormProps {
  onSuccess: (generation: GenerationResponse) => void;
}

export function GenerationForm({ onSuccess }: GenerationFormProps) {
  const { data: nichesData } = useMyNiches();
  const { createGeneration } = useGenerationsMutations();

  const niches = nichesData?.niches ?? [];

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateGenerationInput>({
    resolver: zodResolver(createGenerationSchema),
  });

  const onSubmit = (data: CreateGenerationInput) => {
    createGeneration.mutate(data, {
      onSuccess: (response) => {
        if (response.data?.generation) {
          onSuccess(response.data.generation);
        }
      },
    });
  };

  return (
    <motion.form
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      {/* Nicho */}
      <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
        <Label>Nicho</Label>
        <Select
          onValueChange={(value) =>
            setValue("nicheId", value, { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um nicho" />
          </SelectTrigger>
          <SelectContent>
            {niches.length === 0 ? (
              <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                Nenhum nicho vinculado.{" "}
                <a href="/niches" className="text-primary hover:underline">
                  Adicionar nicho
                </a>
              </div>
            ) : (
              niches.map((niche) => (
                <SelectItem key={niche.id} value={niche.id}>
                  {niche.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.nicheId && (
          <span className="text-destructive text-xs">
            {errors.nicheId.message}
          </span>
        )}
      </motion.div>

      {/* País do público-alvo */}
      <motion.div variants={staggerItem} className="flex flex-col gap-1.5">
        <Label>
          Público-alvo{" "}
          <span className="text-muted-foreground text-xs font-normal">
            (opcional)
          </span>
        </Label>
        <Select
          onValueChange={(value) =>
            setValue("audienceCountry", value, { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um país" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Submit */}
      <motion.div variants={staggerItem}>
        <Button
          type="submit"
          disabled={createGeneration.isPending}
          className="glow-primary w-full"
        >
          {createGeneration.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando conteúdo...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Gerar conteúdo
            </>
          )}
        </Button>
      </motion.div>
    </motion.form>
  );
}
