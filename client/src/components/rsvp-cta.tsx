import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, HelpCircle, X, Mail, Pencil, Calendar as CalendarIcon, Share2, ChevronRight, Download } from "lucide-react";
import { SiGooglecalendar } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useQuery as useEventQuery } from "@tanstack/react-query";
import RsvpDialog from "@/components/rsvp-dialog";
import type { Event, Rsvp, RsvpResponse } from "@shared/schema";
import { buildGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar";

const STORAGE_KEY = "hootenanny-voter";

type PublicRsvp = Omit<Rsvp, "guestEmail">;

interface StoredGuest { name: string; email: string; }

function loadStoredGuest(): StoredGuest | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    if (!name) return null;
    return { name, email: typeof parsed?.email === "string" ? parsed.email : "" };
  } catch { return null; }
}

const STATUS: Record<RsvpResponse, { label: string; icon: React.ComponentType<{ className?: string }>; chipBg: string; chipFg: string }> = {
  yes:   { label: "Going",         icon: Check,      chipBg: "bg-sage-100",      chipFg: "text-sage-600" },
  maybe: { label: "Maybe",         icon: HelpCircle, chipBg: "bg-sand-200",      chipFg: "text-sand-600" },
  no:    { label: "Can't make it", icon: X,          chipBg: "bg-terracotta-100", chipFg: "text-primary"  },
};

interface RsvpCtaProps { eventId: string; eventTitle: string; }

export default function RsvpCta({ eventId, eventTitle: _eventTitle }: RsvpCtaProps) {
  const { toast } = useToast();
  const [guest, setGuest] = useState<StoredGuest | null>(null);

  useEffect(() => {
    setGuest(loadStoredGuest());
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setGuest(loadStoredGuest()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const rsvpsQuery = useQuery<PublicRsvp[]>({ queryKey: [`/api/events/${eventId}/rsvps`] });
  const eventQuery = useEventQuery<Event>({ queryKey: [`/api/events/${eventId}`] });
  const event = eventQuery.data;

  useEffect(() => { setGuest(loadStoredGuest()); }, [rsvpsQuery.dataUpdatedAt]);

  const myRsvp = guest
    ? (rsvpsQuery.data || []).find((r) => r.guestName.trim().toLowerCase() === guest.name.toLowerCase())
    : undefined;

  if (rsvpsQuery.isLoading) return null;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: _eventTitle, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!", description: "Event link copied to clipboard." });
      } catch {
        toast({ title: "Share", description: `Share this link: ${url}` });
      }
    }
  };

  const calendarMenu = event && event.date && event.pollStatus !== "polling" ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full" data-testid="button-rsvpcta-calendar">
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
          Add to calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            const url = buildGoogleCalendarUrl(event);
            if (url) window.open(url, "_blank", "noopener,noreferrer");
            else toast({ title: "Missing date", variant: "destructive" });
          }}
        >
          <SiGooglecalendar className="mr-2 h-4 w-4" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const ok = downloadIcsFile(event);
            if (!ok) { toast({ title: "Missing date", variant: "destructive" }); return; }
            toast({ title: "Calendar file downloaded" });
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Apple / Outlook (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const shareBtn = (
    <Button variant="outline" size="sm" className="rounded-full" onClick={handleShare} data-testid="button-rsvpcta-share">
      <Share2 className="mr-1.5 h-3.5 w-3.5" />
      Share event
    </Button>
  );

  // Already RSVPd — same card layout, status-tinted icon chip + Update button
  if (myRsvp) {
    const status = STATUS[myRsvp.response as RsvpResponse] ?? STATUS.maybe;
    const Icon = status.icon;
    return (
      <div
        className="surface-card mb-6 mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
        data-testid="rsvp-cta-confirmed"
      >
        <div className="flex flex-1 items-center gap-3">
          <span className={`icon-chip-md ${status.chipBg}`}>
            <Icon className={`h-5 w-5 ${status.chipFg}`} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">You're RSVP'd: {status.label}</p>
            <p className="text-sm text-muted-foreground">Changed your mind? Update anytime.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {calendarMenu}
          {shareBtn}
          <RsvpDialog
            eventId={eventId}
            trigger={
              <Button size="sm" className="rounded-full bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white" data-testid="button-update-rsvp">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Update RSVP
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="surface-card mb-6 mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
      data-testid="rsvp-cta-prompt"
    >
      <div className="flex flex-1 items-center gap-3">
        <span className="icon-chip-md bg-terracotta-50">
          <Mail className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">Are you coming?</p>
          <p className="text-sm text-muted-foreground">Let the host know — yes, no, or maybe.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {calendarMenu}
        {shareBtn}
        <RsvpDialog
          eventId={eventId}
          trigger={
            <Button size="sm" className="rounded-full bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white" data-testid="button-rsvp-cta">
              RSVP now
              <ChevronRight className="ml-0.5 h-4 w-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
