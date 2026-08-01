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
      <div className="flex-1 flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-accent rounded-full animate-spin" />
          <div className="h-4 w-40 bg-zinc-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
