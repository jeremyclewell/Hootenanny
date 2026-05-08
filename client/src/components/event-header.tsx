import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Share2, Utensils, MapPin, Users, Calendar, CalendarPlus, Download,
  Clock, Hourglass, Plus, Bell,
} from "lucide-react";
import type { Event } from "@shared/schema";
import { buildGoogleCalendarUrl, downloadIcsFile, parseLocalDate } from "@/lib/calendar";
import { SiGooglecalendar } from "react-icons/si";
import { formatDuration } from "@/lib/duration";
import { format } from "date-fns";

interface EventHeaderProps {
  event: Event;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function calcEndTime(time: string, durationMinutes: number): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const endTotal = h * 60 + m + durationMinutes;
  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const period = endH >= 12 ? "PM" : "AM";
  const hour12 = endH % 12 === 0 ? 12 : endH % 12;
  return `${hour12}:${String(endM).padStart(2, "0")} ${period}`;
}

/** Decorative string-lights svg, top-right of the dark hero. */
function StringLights() {
  const color = "rgba(255, 245, 204, 0.9)";
  return (
    <svg
      className="pointer-events-none absolute right-2 top-2 hidden opacity-90 sm:block"
      width="520"
      height="120"
      viewBox="0 0 520 120"
      fill="none"
      aria-hidden
    >
      <path
        d="M10 20 C 120 90, 220 90, 320 35 S 500 80, 510 25"
        stroke="rgba(255, 245, 204, 0.55)"
        strokeWidth="1"
        fill="none"
      />
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

export default function EventHeader({ event }: EventHeaderProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: event.description || `Join ${event.title}!`, url });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!", description: "Event link copied to clipboard." });
      } catch {
        toast({ title: "Share", description: `Share this link: ${url}` });
      }
    }
  };

  const formattedDate = (() => {
    if (!event.date) return null;
    const d = parseLocalDate(event.date);
    if (Number.isNaN(d.getTime())) return event.date; // fall back to raw string
    return format(d, "EEEE, MMMM d, yyyy");
  })();

  const timeRange = (() => {
    if (!event.time) return null;
    const start = formatTime(event.time);
    if (!event.durationMinutes) return start;
    const end = calcEndTime(event.time, event.durationMinutes);
    return `${start} – ${end}`;
  })();

  const isOpenForRsvps = event.pollStatus !== "polling";

  return (
    <>
      {/* Top nav — white pill card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-warm">
          <Link href="/" className="flex items-center gap-2.5 hover-elevate active-elevate-2 rounded-xl pr-3 -ml-1 px-1 py-0.5">
            <div className="icon-chip-sm bg-coral-gradient">
              <Utensils className="text-white h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-semibold text-foreground">Hootenanny</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {event.date && event.pollStatus !== "polling" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full" data-testid="button-add-to-calendar">
                    <CalendarPlus className="sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Add to calendar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      const url = buildGoogleCalendarUrl(event);
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                      else toast({ title: "Missing date", variant: "destructive" });
                    }}
                    data-testid="menu-google-calendar"
                  >
                    <SiGooglecalendar className="mr-2 h-4 w-4" />
                    Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const ok = downloadIcsFile(event);
                      if (!ok) { toast({ title: "Missing date", variant: "destructive" }); return; }
                      toast({ title: "Calendar file downloaded", description: "Open the .ics file to add it to Apple Calendar or Outlook." });
                    }}
                    data-testid="menu-ics-download"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Apple / Outlook (.ics)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Link href="/create">
              <Button size="sm" className="rounded-full bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white">
                <Plus className="sm:mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Create Event</span>
              </Button>
            </Link>
            <button
              onClick={handleShare}
              className="hover-elevate active-elevate-2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
              aria-label="Share event"
              data-testid="button-share"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
              aria-hidden
            >
              <Bell className="h-4 w-4" />
            </span>
          </div>
        </nav>
      </div>

      {/* Hero card — dark teal gradient with string lights */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div
          className="relative overflow-hidden rounded-3xl p-7 sm:p-10 text-white bg-aurora-hero"
          data-testid="event-hero"
        >
          <StringLights />
          {/* Soft moon glow */}
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%)" }}
            aria-hidden
          />

          <div className="relative">
            {/* Status pills */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {isOpenForRsvps && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full" style={{ background: "hsl(150, 65%, 60%)" }} />
                  Open for RSVPs
                </span>
              )}
              {event.pollStatus === "polling" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm">
                  <Calendar className="h-3 w-3" />
                  Date poll open
                </span>
              )}
              {event.pollStatus === "finalized" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm">
                  <Calendar className="h-3 w-3" />
                  Date confirmed
                </span>
              )}
            </div>

            {/* Title */}
            <h1
              className="mb-8 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
              data-testid="event-title"
            >
              {event.title}
            </h1>

            {/* Description */}
            {event.description && (
              <p className="mb-8 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                {event.description}
              </p>
            )}

            {/* Detail grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {formattedDate && (
                <HeroDetail icon={Calendar} label="Date" value={formattedDate} />
              )}
              {timeRange && (
                <HeroDetail icon={Clock} label="Time" value={timeRange} />
              )}
              {event.location && (
                <HeroDetail icon={MapPin} label="Location" value={event.location} />
              )}
              {event.expectedGuests && (
                <HeroDetail icon={Users} label="Guests" value={`${event.expectedGuests} expected`} />
              )}
              {event.durationMinutes && !event.time && (
                <HeroDetail icon={Hourglass} label="Duration" value={formatDuration(event.durationMinutes)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HeroDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: "rgba(255,255,255,0.10)" }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">{label}</p>
        <p className="mt-0.5 text-sm leading-snug text-white">{value}</p>
      </div>
    </div>
  );
}
