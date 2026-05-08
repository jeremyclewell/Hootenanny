import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, X, MailCheck, Pencil } from "lucide-react";
import RsvpDialog from "@/components/rsvp-dialog";
import type { Rsvp, RsvpResponse } from "@shared/schema";

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

const STATUS: Record<RsvpResponse, { label: string; icon: React.ComponentType<{ className?: string }>; cardClass: string; iconClass: string; dotClass: string }> = {
  yes:   { label: "Going",          icon: Check,       cardClass: "border-sage-100 bg-sage-50",       iconClass: "text-sage-600",  dotClass: "bg-sage-400"  },
  maybe: { label: "Maybe",          icon: HelpCircle,  cardClass: "border-sand-200 bg-sand-100",      iconClass: "text-sand-600",  dotClass: "bg-sand-400"  },
  no:    { label: "Can't make it",  icon: X,           cardClass: "border-terracotta-100 bg-terracotta-50", iconClass: "text-primary", dotClass: "bg-primary" },
};

interface RsvpCtaProps { eventId: string; eventTitle: string; }

export default function RsvpCta({ eventId, eventTitle }: RsvpCtaProps) {
  const [guest, setGuest] = useState<StoredGuest | null>(null);

  useEffect(() => {
    setGuest(loadStoredGuest());
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setGuest(loadStoredGuest()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const rsvpsQuery = useQuery<PublicRsvp[]>({ queryKey: [`/api/events/${eventId}/rsvps`] });

  useEffect(() => { setGuest(loadStoredGuest()); }, [rsvpsQuery.dataUpdatedAt]);

  const myRsvp = guest
    ? (rsvpsQuery.data || []).find((r) => r.guestName.trim().toLowerCase() === guest.name.toLowerCase())
    : undefined;

  if (rsvpsQuery.isLoading) return null;

  if (myRsvp) {
    const status = STATUS[myRsvp.response as RsvpResponse] ?? STATUS.maybe;
    const Icon = status.icon;
    return (
      <div
        className={`mb-6 flex flex-col gap-3 surface-callout p-4 sm:flex-row sm:items-center sm:justify-between ${status.cardClass}`}
        data-testid="rsvp-cta-confirmed"
      >
        <div className="flex items-center gap-3">
          <span className="icon-chip-md bg-card ">
            <Icon className={`h-5 w-5 ${status.iconClass}`} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">You're RSVP'd: {status.label}</p>
            <p className="text-xs text-muted-foreground">Changed your mind? Update anytime.</p>
          </div>
        </div>
        <RsvpDialog
          eventId={eventId}
          trigger={
            <Button variant="outline" size="sm" data-testid="button-update-rsvp">
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Update RSVP
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="mb-6 flex flex-col gap-4 surface-callout border-terracotta-100 bg-terracotta-50 p-5 sm:flex-row sm:items-center sm:justify-between"
      data-testid="rsvp-cta-prompt"
    >
      <div className="flex items-center gap-3">
        <span className="icon-chip-md bg-primary text-white ">
          <MailCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">Are you coming?</p>
          <p className="text-sm text-muted-foreground">Let the host know — yes, no, or maybe.</p>
        </div>
      </div>
      <RsvpDialog
        eventId={eventId}
        trigger={
          <Button className="bg-primary hover:bg-primary/90 h-11" data-testid="button-rsvp-cta">
            <MailCheck className="mr-2 h-4 w-4" />
            RSVP now
          </Button>
        }
      />
    </div>
  );
}
