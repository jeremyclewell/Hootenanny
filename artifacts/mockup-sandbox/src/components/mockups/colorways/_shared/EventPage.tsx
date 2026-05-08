import {
  Utensils, Bell, Calendar, Clock, MapPin, Mail, Users, Plus,
  Share2, Check, HelpCircle, X, FileText, Link2, Image as ImageIcon,
  BarChart3, ChevronRight, ChevronDown, ChevronsUpDown, Compass,
} from "lucide-react";

export type EventPalette = {
  name: string;
  pageBg: string;
  fg: string;            // primary ink
  mutedFg: string;
  card: string;          // white card
  border: string;
  primary: string;       // CTA color
  primaryFg: string;
  primaryGradient: string; // CSS background for hero CTA
  primarySoft: string;   // light tint for icon chips, pill bg
  primarySoftFg: string;
  // Hero
  heroGradient: string;  // CSS gradient
  heroFg: string;        // text on hero
  heroMutedFg: string;
  heroChipBg: string;    // translucent icon chip bg
  heroChipFg: string;
  heroPillBg: string;    // status pill bg (translucent)
  heroPillFg: string;
  // Status cards (Going / Maybe / Cant)
  going: { bg: string; iconBg: string; iconFg: string; ink: string };
  maybe: { bg: string; iconBg: string; iconFg: string; ink: string };
  cant:  { bg: string; iconBg: string; iconFg: string; ink: string };
  // Custom item tiles
  tileNote:  { bg: string; iconFg: string };
  tileLink:  { bg: string; iconFg: string };
  tilePhoto: { bg: string; iconFg: string };
  tilePoll:  { bg: string; iconFg: string };
  serif: string;
  navActiveBg: string;   // dark active pill
  navActiveFg: string;
};

export function EventPage({ palette: p }: { palette: EventPalette }) {
  return (
    <div
      className="min-h-screen"
      style={{ background: p.pageBg, color: p.fg, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Top nav */}
        <nav
          className="flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ background: p.card, border: `1px solid ${p.border}` }}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 pr-3">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: p.primary }}
              >
                <Utensils className="h-4.5 w-4.5" style={{ color: p.primaryFg }} />
              </div>
              <span className="text-lg font-semibold" style={{ fontFamily: p.serif }}>
                Hootenanny
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <NavItem icon={<Calendar className="h-4 w-4" />} label="Events" p={p} />
              <NavItem icon={<Utensils className="h-4 w-4" />} label="Host" p={p} active />
              <NavItem icon={<Users className="h-4 w-4" />} label="My RSVPs" p={p} />
              <NavItem icon={<Compass className="h-4 w-4" />} label="Browse" p={p} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1.5"
              style={{ background: p.primaryGradient, color: p.primaryFg, boxShadow: `0 6px 18px ${withAlpha(p.primary, .35)}` }}
            >
              <Plus className="h-4 w-4" /> Create Event
            </button>
            <button
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ border: `1px solid ${p.border}`, background: p.card }}
            >
              <Bell className="h-4 w-4" style={{ color: p.mutedFg }} />
            </button>
            <button
              className="flex items-center gap-1 rounded-full pr-2 pl-0.5 py-0.5"
              style={{ border: `1px solid ${p.border}`, background: p.card }}
            >
              <span
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: p.going.iconBg, color: p.going.iconFg }}
              >
                M
              </span>
              <ChevronDown className="h-3.5 w-3.5" style={{ color: p.mutedFg }} />
            </button>
          </div>
        </nav>

        {/* Hero card */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
          style={{ background: p.heroGradient, color: p.heroFg }}
        >
          {/* String lights */}
          <StringLights color={withAlpha("#fff5cc", .9)} />
          {/* Soft moon glow */}
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-30"
            style={{ background: `radial-gradient(circle, ${withAlpha("#ffffff", .35)}, transparent 70%)` }}
          />

          <div className="relative">
            {/* Status pills */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span
                className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: p.heroPillBg, color: p.heroPillFg, backdropFilter: "blur(4px)" }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: "hsl(150, 65%, 60%)" }} />
                Open for RSVPs
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: p.heroPillBg, color: p.heroPillFg, backdropFilter: "blur(4px)" }}
              >
                <Calendar className="h-3 w-3" />
                Date confirmed
              </span>
              <button
                className="ml-auto h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: p.heroChipBg, color: p.heroChipFg }}
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>

            {/* Title */}
            <h1
              className="text-5xl sm:text-6xl font-semibold tracking-tight mb-8"
              style={{ fontFamily: p.serif }}
            >
              Sunday Garden Picnic
            </h1>

            {/* Detail row */}
            <div className="grid sm:grid-cols-3 gap-6">
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Date" value="Saturday, May 16, 2026" p={p} />
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Time" value="2:00 PM – 5:00 PM" p={p} />
              <DetailRow
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value="Riverside Park, 1816 Lenape Unionville Rd, Chester County, PA"
                p={p}
              />
            </div>
          </div>
        </div>

        {/* Are you coming */}
        <Section p={p}>
          <SectionRow
            iconBg={p.primarySoft}
            iconFg={p.primarySoftFg}
            icon={<Mail className="h-5 w-5" />}
            title="Are you coming?"
            subtitle="Let the host know — yes, no, or maybe."
            actions={
              <>
                <GhostBtn p={p} icon={<Calendar className="h-3.5 w-3.5" />}>Add to calendar</GhostBtn>
                <GhostBtn p={p} icon={<Share2 className="h-3.5 w-3.5" />}>Share event</GhostBtn>
                <button
                  className="rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1"
                  style={{ background: p.primaryGradient, color: p.primaryFg, boxShadow: `0 6px 16px ${withAlpha(p.primary, .35)}` }}
                >
                  RSVP now <ChevronRight className="h-4 w-4" />
                </button>
              </>
            }
          />
        </Section>

        {/* Whos coming */}
        <Section p={p}>
          <SectionRow
            iconBg={p.primarySoft}
            iconFg={p.primarySoftFg}
            icon={<Users className="h-5 w-5" />}
            title="Who's coming"
            subtitle="9 going · 3 maybe · 1 can't make it"
            actions={<GhostBtn p={p}>View all RSVPs <ChevronRight className="h-3.5 w-3.5" /></GhostBtn>}
          />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <RsvpCard tone={p.going} icon={<Check className="h-5 w-5" />} label="Going" sub="Mae, Theo, Sara +6" count={9} p={p} />
            <RsvpCard tone={p.maybe} icon={<HelpCircle className="h-5 w-5" />} label="Maybe" sub="Jules, Alex, Bee" count={3} p={p} />
            <RsvpCard tone={p.cant}  icon={<X className="h-5 w-5" />} label="Can't make it" sub="Ren" count={1} p={p} />
          </div>
        </Section>

        {/* Add a custom item */}
        <Section p={p}>
          <SectionRow
            iconBg={p.primarySoft}
            iconFg={p.primarySoftFg}
            icon={<Plus className="h-5 w-5" />}
            title="Add a custom item"
            subtitle="Make this event even better — add a note, link, or special request."
            actions={<GhostBtn p={p}>Add item</GhostBtn>}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <Tile tone={p.tileNote}  icon={<FileText className="h-5 w-5" />}  title="Note"  sub="Add a note for guests" p={p} />
            <Tile tone={p.tileLink}  icon={<Link2 className="h-5 w-5" />}     title="Link"  sub="Share a useful link" p={p} />
            <Tile tone={p.tilePhoto} icon={<ImageIcon className="h-5 w-5" />} title="Photo" sub="Add a photo" p={p} />
            <Tile tone={p.tilePoll}  icon={<BarChart3 className="h-5 w-5" />} title="Poll"  sub="Ask a question" p={p} />
          </div>
        </Section>

        {/* Footer label */}
        <div className="flex items-center justify-between text-xs pt-2" style={{ color: p.mutedFg }}>
          <span style={{ fontFamily: p.serif }} className="font-semibold">{p.name}</span>
          <div className="flex items-center gap-1.5">
            {[p.primary, p.heroPillFg, p.going.iconBg, p.maybe.iconBg, p.cant.iconBg].map((c, i) => (
              <span key={i} className="inline-block w-3.5 h-3.5 rounded-full" style={{ background: c, border: `1px solid ${p.border}` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function NavItem({ icon, label, p, active }: { icon: React.ReactNode; label: string; p: EventPalette; active?: boolean }) {
  return (
    <button
      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm"
      style={
        active
          ? { background: p.navActiveBg, color: p.navActiveFg }
          : { color: p.mutedFg, background: "transparent" }
      }
    >
      {icon} {label}
    </button>
  );
}

function DetailRow({ icon, label, value, p }: { icon: React.ReactNode; label: string; value: string; p: EventPalette }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: p.heroChipBg, color: p.heroChipFg }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide" style={{ color: p.heroMutedFg }}>{label}</p>
        <p className="text-sm leading-snug mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function Section({ children, p }: { children: React.ReactNode; p: EventPalette }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: p.card, border: `1px solid ${p.border}` }}
    >
      {children}
    </div>
  );
}

function SectionRow({
  icon, iconBg, iconFg, title, subtitle, actions,
}: {
  icon: React.ReactNode; iconBg: string; iconFg: string;
  title: string; subtitle: string; actions: React.ReactNode;
}) {
  return (
    <div className="flex items-start sm:items-center gap-4 flex-wrap">
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg, color: iconFg }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-base">{title}</p>
        <p className="text-sm" style={{ color: "currentColor", opacity: .65 }}>{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">{actions}</div>
    </div>
  );
}

function GhostBtn({ children, icon, p }: { children: React.ReactNode; icon?: React.ReactNode; p: EventPalette }) {
  return (
    <button
      className="rounded-full px-3.5 py-2 text-sm font-medium flex items-center gap-1.5"
      style={{ border: `1px solid ${p.border}`, background: p.card, color: p.fg }}
    >
      {icon}{children}
    </button>
  );
}

function RsvpCard({
  tone, icon, label, sub, count, p,
}: {
  tone: EventPalette["going"]; icon: React.ReactNode; label: string; sub: string; count: number; p: EventPalette;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: tone.bg, border: `1px solid ${withAlpha(tone.iconFg, .15)}`, color: tone.ink }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: tone.iconBg, color: tone.iconFg }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs truncate" style={{ opacity: .7 }}>{sub}</p>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{count}</div>
    </div>
  );
}

function Tile({
  tone, icon, title, sub, p,
}: {
  tone: { bg: string; iconFg: string }; icon: React.ReactNode; title: string; sub: string; p: EventPalette;
}) {
  return (
    <button
      className="rounded-2xl p-4 text-left flex items-start gap-3"
      style={{ background: tone.bg, border: `1px solid ${withAlpha(tone.iconFg, .15)}` }}
    >
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: withAlpha(tone.iconFg, .15), color: tone.iconFg }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm" style={{ color: p.fg }}>{title}</p>
        <p className="text-xs" style={{ color: p.mutedFg }}>{sub}</p>
      </div>
    </button>
  );
}

function StringLights({ color }: { color: string }) {
  return (
    <svg
      className="absolute top-2 right-2 opacity-90"
      width="520" height="120" viewBox="0 0 520 120" fill="none"
      style={{ pointerEvents: "none" }}
    >
      <path d="M10 20 C 120 90, 220 90, 320 35 S 500 80, 510 25" stroke={withAlpha(color, .55)} strokeWidth="1" fill="none" />
      {[
        [55, 55], [110, 78], [165, 80], [220, 65], [275, 50],
        [330, 38], [380, 50], [430, 65], [475, 70], [505, 50],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="9" fill={color} opacity="0.25" />
          <circle cx={cx} cy={cy} r="3.5" fill={color} />
        </g>
      ))}
    </svg>
  );
}

function withAlpha(color: string, a: number) {
  // accept hex (#rrggbb / #rgb) or hsl(); return a string with alpha
  if (color.startsWith("#")) {
    let h = color.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (color.startsWith("hsl(")) {
    const inner = color.slice(4, -1);
    return `hsla(${inner}, ${a})`;
  }
  return color;
}
