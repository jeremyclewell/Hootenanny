import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Upload, Utensils, MapPin, Users, Calendar, CalendarPlus, Download, MailCheck, Clock, Hourglass } from "lucide-react";
import type { Event } from "@shared/schema";
import { buildGoogleCalendarUrl, downloadIcsFile, parseLocalDate } from "@/lib/calendar";
import { SiGooglecalendar } from "react-icons/si";
import RsvpDialog from "@/components/rsvp-dialog";
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

/** Concentric-circles "event disc" icon in a soft rounded square. */
function ThemeDisc() {
  return (
    <div className="w-20 h-20 rounded-2xl bg-terracotta-50 border border-terracotta-100 flex items-center justify-center shrink-0">
      <div className="relative w-12 h-12 rounded-full border-2 border-primary/50">
        <div className="absolute inset-1.5 rounded-full border border-primary/40" />
        <div className="absolute inset-3.5 rounded-full border border-primary/30" />
        <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70" />
      </div>
    </div>
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

  const formattedDate = event.date
    ? format(parseLocalDate(event.date), "EEE, MMM d, yyyy")
    : null;

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
      {/* Nav bar */}
      <header className="bg-card border-b border-border shadow-warm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <Utensils className="text-white h-4 w-4" />
              </div>
              <div>
                <span className="text-lg font-serif font-semibold text-foreground">Hootenanny</span>
                <p className="text-xs text-muted-foreground leading-none">{event.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {event.date && event.pollStatus !== "polling" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-add-to-calendar">
                      <CalendarPlus className="mr-2 h-4 w-4" />
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
              {event.pollStatus !== "polling" && (
                <RsvpDialog
                  eventId={event.id}
                  trigger={
                    <Button variant="outline" size="sm" data-testid="button-rsvp">
                      <MailCheck className="mr-2 h-4 w-4" />
                      RSVP
                    </Button>
                  }
                />
              )}
              <Button onClick={handleShare} size="sm" className="bg-primary hover:bg-primary/90 shadow-sm">
                <Upload className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Event info card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="relative bg-card rounded-2xl border border-border shadow-warm p-7 sm:p-8 mb-6 overflow-hidden">
          {/* Asterisk decoration */}
          <span className="absolute top-5 right-6 text-2xl text-muted-foreground/30 select-none pointer-events-none" aria-hidden>✦</span>

          <div className="flex items-start gap-5">
            <ThemeDisc />

            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {isOpenForRsvps && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 border border-sage-100 px-3 py-1 text-xs font-medium text-sage-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage-600 inline-block" />
                    Open for RSVPs
                  </span>
                )}
                {event.pollStatus === "polling" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 border border-sand-200 px-3 py-1 text-xs font-medium text-sand-600">
                    <Calendar className="h-3 w-3" />
                    Date poll open
                  </span>
                )}
                {event.pollStatus === "finalized" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                    Date confirmed
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-3 leading-tight">
                {event.title}
              </h1>

              {/* Description */}
              {event.description && (
                <p className="text-sm text-muted-foreground mb-7 leading-relaxed max-w-2xl">
                  {event.description}
                </p>
              )}

              {/* Detail grid: 3 columns for date/time/location, then guests on its own row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
                {formattedDate && (
                  <DetailCell icon={Calendar} label="Date" value={formattedDate} />
                )}
                {timeRange && (
                  <DetailCell icon={Clock} label="Time" value={timeRange} />
                )}
                {event.location && (
                  <DetailCell icon={MapPin} label="Location" value={event.location} />
                )}
                {event.expectedGuests && (
                  <DetailCell icon={Users} label="Guests" value={`${event.expectedGuests} expected`} />
                )}
                {event.durationMinutes && !event.time && (
                  <DetailCell icon={Hourglass} label="Duration" value={formatDuration(event.durationMinutes)} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailCell({
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
      <div className="w-7 h-7 rounded-md bg-sand-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-foreground/70" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-foreground leading-snug">{value}</p>
      </div>
    </div>
  );
}
