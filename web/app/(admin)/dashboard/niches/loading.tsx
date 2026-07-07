import { Skeleton } from "@/components/ui/skeleton";
import { NichesTableSkeleton } from "../_components/niches/niches-table-skeleton";

export default function DashboardNichesLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tabela */}
      <NichesTableSkeleton />
    </div>
  );
}
