import { Utensils, Plus, Calendar, Clock, CheckSquare, Square, AlignLeft, MapPin } from "lucide-react";

export type Palette = {
  name: string;
  bg: string;          // page background
  fg: string;          // foreground / body text
  muted: string;       // muted bg
  mutedFg: string;     // muted text
  card: string;        // card bg (usually white-ish)
  border: string;      // borders
  primary: string;     // primary accent (CTA, badges, progress)
  primaryFg: string;   // text on primary
  pillBg: string;      // hero pill bg (tinted primary)
  pillFg: string;      // hero pill text
  okBg: string;        // success / RSVPd badge bg (sage/sea-glass)
  okFg: string;        // success text used for checkmarks
  iconChipBg: string;  // theme disc bg (top-card icon)
  iconChipBorder: string; // theme disc border
  iconChipInner: string; // inner ring color
  serif: string;       // serif font family
  avatars: { letter: string; bg: string; fg: string }[];
  loserBar: string;    // unchosen poll bar fill
};

export function HootHome({ palette }: { palette: Palette }) {
  const p = palette;
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: p.bg, color: p.fg, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Header */}
      <header
        className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between"
        style={{
          background: p.card,
          borderBottom: `1px solid ${p.border}`,
          boxShadow: "0 1px 2px rgba(120,80,40,.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ background: p.primary }}
          >
            <Utensils className="h-4 w-4" style={{ color: p.primaryFg }} />
          </div>
          <span className="text-lg font-semibold" style={{ fontFamily: p.serif }}>
            Hootenanny
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full text-sm px-3.5 py-1.5"
            style={{ border: `1px solid ${p.border}`, color: p.fg, background: "transparent" }}
          >
            See an example
          </button>
          <button
            className="rounded-full text-sm px-4 py-1.5 flex items-center gap-1 font-medium"
            style={{ background: p.primary, color: p.primaryFg }}
          >
            <Plus className="h-3.5 w-3.5" />
            New event
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center px-6 sm:px-10 lg:px-16 py-10 lg:py-0">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left */}
          <div className="flex flex-col gap-6 lg:gap-7">
            <div className="flex items-center gap-3">
              <span className="text-xl select-none" style={{ color: p.mutedFg }}>✦</span>
              <span
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full"
                style={{ background: p.pillBg, color: p.pillFg }}
              >
                <Plus className="h-3 w-3" />
                Plan a potluck in minutes
              </span>
            </div>

            <h1
              className="text-[3.5rem] sm:text-[4.5rem] lg:text-[5rem] font-bold leading-[1.05] tracking-tight"
              style={{ fontFamily: p.serif }}
            >
              Gather the gang.<br />
              Bring all the<br />
              good stuff.
            </h1>

            <p className="text-base leading-relaxed max-w-md" style={{ color: p.mutedFg }}>
              Themed events, date polls, and a potluck list everyone can claim from.
              One link, no spreadsheets, no group-chat chaos.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full px-6 py-2.5 font-medium flex items-center gap-1.5"
                style={{ background: p.primary, color: p.primaryFg }}
              >
                <Plus className="h-4 w-4" />
                Create new event
              </button>
              <button
                className="rounded-full px-6 py-2.5 font-medium"
                style={{ border: `1px solid ${p.border}`, color: p.fg, background: "transparent" }}
              >
                See an example
              </button>
            </div>

            <div className="flex items-center gap-5 text-sm" style={{ color: p.mutedFg }}>
              <span className="flex items-center gap-1.5">
                <span style={{ color: p.okFg }}>✓</span> No sign-up to RSVP
              </span>
              <span className="flex items-center gap-1.5">
                <span style={{ color: p.okFg }}>✓</span> Free for everyone
              </span>
            </div>
          </div>

          {/* Right: floating cards */}
          <div className="relative h-[460px] hidden sm:block">
            {/* Card 1 */}
            <div
              className="absolute top-0 left-[8%] w-[360px] rounded-2xl p-5 z-20 rotate-2"
              style={{
                background: p.card,
                border: `1px solid ${p.border}`,
                boxShadow: "0 12px 32px rgba(80,50,20,.12)",
              }}
            >
              <div
                className="absolute -top-3 right-4 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ background: p.okBg, color: "#fff" }}
              >
                RSVP'D <span>✓</span>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: p.iconChipBg, border: `2px solid ${p.iconChipBorder}` }}
                >
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ border: `2px solid ${p.iconChipInner}` }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">Sunday Garden Picnic</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                    <span className="flex items-center gap-1 text-xs" style={{ color: p.mutedFg }}>
                      <Calendar className="h-3 w-3" /> Sun, Jun 14
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: p.mutedFg }}>
                      <Clock className="h-3 w-3" /> 2:00 PM
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: p.mutedFg }}>
                      <MapPin className="h-3 w-3" /> Riverside Park
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: p.mutedFg }}>Items claimed</span>
                  <span className="text-xs font-medium">12 of 20</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: p.muted }}>
                  <div className="h-full w-[60%] rounded-full" style={{ background: p.primary }} />
                </div>
              </div>
              <div
                className="my-3.5"
                style={{ borderTop: `1px dashed ${p.border}` }}
              />
              <div className="flex items-center justify-between">
                <div className="flex -space-x-1.5">
                  {p.avatars.map((a) => (
                    <div
                      key={a.letter}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{ background: a.bg, color: a.fg, border: `2px solid ${p.card}` }}
                    >
                      {a.letter}
                    </div>
                  ))}
                </div>
                <span className="text-xs" style={{ color: p.mutedFg }}>
                  <span className="font-medium" style={{ color: p.fg }}>9 going</span> · 3 maybe
                </span>
              </div>
            </div>

            {/* Card 2: Date poll */}
            <div
              className="absolute top-[185px] left-[0%] w-[240px] rounded-2xl p-4 z-10 -rotate-3"
              style={{
                background: p.card,
                border: `1px solid ${p.border}`,
                boxShadow: "0 8px 22px rgba(80,50,20,.08)",
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-3"
                style={{ color: p.mutedFg }}
              >
                Date poll · 11 votes
              </p>
              <div className="space-y-2.5">
                {[
                  { month: "JUN", day: "14", label: "Sunday", votes: 7, pct: "100%", winner: true },
                  { month: "JUN", day: "21", label: "Sunday", votes: 3, pct: "43%", winner: false },
                  { month: "JUN", day: "28", label: "Sunday", votes: 1, pct: "14%", winner: false },
                ].map(({ month, day, label, votes, pct, winner }) => (
                  <div key={day} className="flex items-center gap-2.5">
                    <div
                      className="text-center rounded-lg px-1.5 py-1 min-w-[40px]"
                      style={{
                        background: winner ? p.primary : p.muted,
                        color: winner ? p.primaryFg : p.fg,
                      }}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest leading-none opacity-80">
                        {month}
                      </p>
                      <p className="text-base font-bold leading-none mt-0.5">{day}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{label}</span>
                        <span className="text-xs" style={{ color: p.mutedFg }}>{votes}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: p.muted }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: pct, background: winner ? p.primary : p.loserBar }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Potluck list */}
            <div
              className="absolute top-[200px] right-[0%] w-[255px] rounded-2xl p-4 rotate-1"
              style={{
                background: p.card,
                border: `1px solid ${p.border}`,
                boxShadow: "0 8px 22px rgba(80,50,20,.08)",
                zIndex: 15,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <AlignLeft className="h-3.5 w-3.5" style={{ color: p.mutedFg }} />
                  Potluck list
                </div>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: p.primary, color: p.primaryFg }}
                >
                  8
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Apple pie", person: "Mae", done: true },
                  { label: "Lemonade", person: "Theo", done: true },
                  { label: "Veggie platter", person: "Sara", done: true },
                  { label: "Coleslaw", person: "", done: false },
                  { label: "Sourdough bread", person: "", done: false },
                ].map(({ label, person, done }) => (
                  <div key={label} className="flex items-center gap-2">
                    {done ? (
                      <CheckSquare className="h-3.5 w-3.5 shrink-0" style={{ color: p.okFg }} />
                    ) : (
                      <Square className="h-3.5 w-3.5 shrink-0" style={{ color: p.border }} />
                    )}
                    <span
                      className="flex-1 text-xs"
                      style={{
                        textDecoration: done ? "line-through" : "none",
                        color: done ? p.mutedFg : p.fg,
                      }}
                    >
                      {label}
                    </span>
                    {person && (
                      <span className="text-[11px]" style={{ color: p.mutedFg }}>
                        {person}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer label with palette name */}
      <div
        className="px-6 sm:px-10 lg:px-16 py-3 text-xs flex items-center justify-between"
        style={{ color: p.mutedFg, borderTop: `1px solid ${p.border}` }}
      >
        <span style={{ fontFamily: p.serif }} className="font-semibold">
          {p.name}
        </span>
        <div className="flex items-center gap-1.5">
          {[p.bg, p.primary, p.okBg, p.iconChipBorder, p.muted].map((c, i) => (
            <span
              key={i}
              className="inline-block w-3.5 h-3.5 rounded-full"
              style={{ background: c, border: `1px solid ${p.border}` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
