export function HeroVisual() {
  return (
    <div
      className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-vtc-blue-800/60 to-vtc-blue-950 shadow-2xl shadow-black/40 sm:aspect-[5/4] lg:aspect-[4/5]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />

      {/* Court lines */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.07]"
        viewBox="0 0 400 500"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect x="40" y="60" width="320" height="380" stroke="white" strokeWidth="2" />
        <line x1="40" y1="250" x2="360" y2="250" stroke="white" strokeWidth="2" />
        <line x1="200" y1="60" x2="200" y2="440" stroke="white" strokeWidth="1.5" strokeDasharray="8 8" />
        <circle cx="200" cy="250" r="40" stroke="white" strokeWidth="1.5" />
        <path d="M40 250 Q 120 180 200 250 Q 280 320 360 250" stroke="white" strokeWidth="1" fill="none" opacity="0.5" />
      </svg>

      {/* Volleyball */}
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-28 w-28 animate-[float_6s_ease-in-out_infinite] sm:h-36 sm:w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-2xl">
            <circle cx="60" cy="60" r="56" fill="url(#ballGradient)" />
            <path
              d="M60 4 C60 4 20 30 20 60 C20 90 60 116 60 116"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M60 4 C60 4 100 30 100 60 C100 90 60 116 60 116"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M4 60 C4 60 30 20 60 20 C90 20 116 60 116 60"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M4 60 C4 60 30 100 60 100 C90 100 116 60 116 60"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2"
              fill="none"
            />
            <defs>
              <radialGradient id="ballGradient" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#d5e0f5" />
                <stop offset="100%" stopColor="#7a96d6" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Photo placeholder frame */}
      <div className="absolute inset-x-6 bottom-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <svg className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-white/50">
            Treniruočių nuotrauka bus čia
          </p>
        </div>
      </div>

      {/* Accent lines */}
      <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
    </div>
  );
}
