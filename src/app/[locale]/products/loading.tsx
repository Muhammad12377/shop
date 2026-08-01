export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="h-5 w-32 bg-zinc-200 rounded-lg animate-pulse" />
          <div className="hidden md:flex items-center gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 w-16 bg-zinc-200 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-zinc-200 animate-pulse" />
            <div className="h-9 w-9 rounded-full bg-zinc-200 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="h-10 w-40 bg-zinc-200 rounded-lg animate-pulse mb-6" />
        <div className="flex gap-3 mb-8 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-28 shrink-0 rounded-full bg-zinc-200 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="aspect-square bg-zinc-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-zinc-200 rounded-lg animate-pulse" />
                <div className="h-5 w-1/2 bg-zinc-200 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
