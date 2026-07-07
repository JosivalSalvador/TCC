import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col bg-[#0a0a10]">
      {/* Hero skeleton — bate com a estrutura real: texto + card de output lado a lado */}
      <div className="flex min-h-screen items-center px-6 py-20">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Coluna de texto */}
          <div className="flex w-full max-w-xl flex-col items-center gap-6 lg:items-start">
            <Skeleton className="h-6 w-56 rounded-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-4/5" />
            <Skeleton className="h-5 w-full max-w-md" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-3">
              <Skeleton className="h-11 w-52" />
              <Skeleton className="h-11 w-36" />
            </div>
          </div>

          {/* Coluna do card de output */}
          <div className="w-full lg:ml-auto lg:max-w-105">
            <Skeleton className="h-125 w-full rounded-2xl" />
          </div>
        </div>
      </div>

      {/* How it works skeleton */}
      <div className="px-6 py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12">
          <Skeleton className="h-8 w-48" />
          <div className="grid w-full gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Features skeleton — bate com o bento assimétrico real: 2 grandes + 4 pequenas */}
      <div className="px-6 py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12">
          <Skeleton className="h-8 w-64" />
          <div className="flex w-full flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl" />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
