import { Skeleton } from "@/components/ui/skeleton";
import { UsersTableSkeleton } from "../_components/users/users-table-skeleton";

export default function DashboardUsersLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Tabela */}
      <UsersTableSkeleton />
    </div>
  );
}
