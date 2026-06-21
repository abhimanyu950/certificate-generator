interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-[#cbd5e1]/40 rounded ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-[#cbd5e1]/60 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-4">
      <div className="flex space-x-4 p-4 border-b border-[#cbd5e1]/60">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-1/6" />
        <Skeleton className="h-5 w-1/6" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex space-x-4 p-4 border-b border-[#cbd5e1]/20">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-1/3" />
          </div>
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-5 w-1/6" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}
