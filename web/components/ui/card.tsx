import * as React from "react";
import { cn } from "@/lib/utils/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // MUDANÇAS CRÍTICAS:
        // 1. 'h-full' para garantir alturas iguais no carrossel/grid.
        // 2. 'overflow-hidden' para a imagem colar nas bordas e respeitar o rounded.
        // 3. Removido o 'py' e 'gap' geral (deixamos o respiro para o Content/Footer).
        "bg-card text-card-foreground flex h-full flex-col overflow-hidden rounded-xl border shadow-sm sm:rounded-2xl",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Adicionado 'pt' para compensar a retirada do 'py' do container pai
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-3 pt-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] sm:gap-2 sm:px-4 sm:pt-4 md:px-6 md:pt-6 [.border-b]:pb-3 sm:[.border-b]:pb-4 md:[.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base leading-none font-semibold sm:text-lg",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-xs sm:text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      // Adicionado 'flex-1' para empurrar o Footer pro final e py para respiro
      className={cn(
        "flex-1 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6",
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6 [.border-t]:pt-3 sm:[.border-t]:pt-4 md:[.border-t]:pt-6",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
