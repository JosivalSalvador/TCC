// (admin)/dashboard/settings/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLoading() {
  return (
    <div className="mx-auto w-[90%] max-w-3xl">
      <div className="flex flex-col gap-8 py-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>

        {/* Perfil */}
        <Skeleton className="h-64 w-full rounded-xl" />

        {/* Senha */}
        <Skeleton className="h-64 w-full rounded-xl" />

        {/* Separador */}
        <div className="border-border/60 border-t" />

        {/* Danger zone */}
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
