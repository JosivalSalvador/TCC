import { Skeleton } from "@/components/ui/skeleton";

export function FeedbackSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16 rounded-md" />
      <Skeleton className="h-8 w-16 rounded-md" />
    </div>
  );
}
