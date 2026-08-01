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
        <div className="h-4 w-48 bg-zinc-200 rounded-lg animate-pulse mb-8" />
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <div className="aspect-square rounded-2xl bg-zinc-200 animate-pulse" />
            <div className="flex gap-3 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-16 h-16 rounded-xl bg-zinc-200 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <div className="h-8 w-3/4 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-6 w-40 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-4 w-5/6 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="flex gap-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-zinc-200 animate-pulse" />
              ))}
            </div>
            <div className="h-14 w-full rounded-full bg-zinc-200 animate-pulse mt-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
