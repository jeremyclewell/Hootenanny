import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Share, Utensils, MapPin, Users, Calendar, CalendarPlus, Download, MailCheck, Clock, Hourglass } from "lucide-react";
import type { Event } from "@shared/schema";
import { buildGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar";
import { SiGooglecalendar } from "react-icons/si";
import RsvpDialog from "@/components/rsvp-dialog";
import { formatDuration } from "@/lib/duration";

interface EventHeaderProps {
  event: Event;
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

  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return time;
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  };

  const themeIcon = (theme: string) => {
    switch (theme) {
      case "pool-party": return "🏊‍♀️";
      case "bbq": return "🔥";
      case "kids-party": return "🎂";
      case "thanksgiving": return "🦃";
      default: return "🍽️";
    }
  };

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
                      <span className="hidden sm:inline">Add to Calendar</span>
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
              <Button onClick={handleShare} size="sm" className="bg-primary hover:bg-primary/90">
                <Share className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Event info card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-card rounded-2xl border border-border shadow-warm p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-terracotta-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
              {themeIcon(event.theme)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-serif font-bold text-foreground mb-1">{event.title}</h2>

              {/* Date / time / duration */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                {event.date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {event.date}
                    {event.time && ` · ${formatTime(event.time)}`}
                  </span>
                )}
                {event.durationMinutes && event.date && (
                  <span className="flex items-center gap-1.5">
                    <Hourglass className="h-3.5 w-3.5 text-primary" />
                    {formatDuration(event.durationMinutes)}
                  </span>
                )}
                {event.pollStatus === "polling" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 border border-sand-200 px-2.5 py-0.5 text-xs font-medium text-sand-600">
                    <Calendar className="h-3 w-3" />
                    Date being voted on
                  </span>
                )}
              </div>

              {event.description && (
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{event.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {event.location}
                  </span>
                )}
                {event.expectedGuests && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {event.expectedGuests} expected guests
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
