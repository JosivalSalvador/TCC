import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Perfil */}
      <Skeleton className="h-56 w-full rounded-xl" />

      {/* Senha */}
      <Skeleton className="h-56 w-full rounded-xl" />

      {/* Danger zone */}
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}
