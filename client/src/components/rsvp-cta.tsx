import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, X, MailCheck, Pencil } from "lucide-react";
import RsvpDialog from "@/components/rsvp-dialog";
import type { Rsvp, RsvpResponse } from "@shared/schema";

const STORAGE_KEY = "hootenanny-voter";

type PublicRsvp = Omit<Rsvp, "guestEmail">;

interface StoredGuest {
  name: string;
  email: string;
}

function loadStoredGuest(): StoredGuest | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    if (!name) return null;
    return { name, email: typeof parsed?.email === "string" ? parsed.email : "" };
  } catch {
    return null;
  }
}

const STATUS: Record<
  RsvpResponse,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    cardClass: string;
    iconClass: string;
  }
> = {
  yes: {
    label: "Going",
    icon: Check,
    cardClass: "border-green-200 bg-green-50",
    iconClass: "text-green-600",
  },
  maybe: {
    label: "Maybe",
    icon: HelpCircle,
    cardClass: "border-amber-200 bg-amber-50",
    iconClass: "text-amber-600",
  },
  no: {
    label: "Can't make it",
    icon: X,
    cardClass: "border-red-200 bg-red-50",
    iconClass: "text-red-600",
  },
};

interface RsvpCtaProps {
  eventId: string;
  eventTitle: string;
}

export default function RsvpCta({ eventId, eventTitle }: RsvpCtaProps) {
  const [guest, setGuest] = useState<StoredGuest | null>(null);

  useEffect(() => {
    setGuest(loadStoredGuest());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setGuest(loadStoredGuest());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const rsvpsQuery = useQuery<PublicRsvp[]>({
    queryKey: [`/api/events/${eventId}/rsvps`],
  });

  // Refresh stored guest whenever RSVPs update (covers same-tab updates after submit)
  useEffect(() => {
    setGuest(loadStoredGuest());
  }, [rsvpsQuery.dataUpdatedAt]);

  const myRsvp = guest
    ? (rsvpsQuery.data || []).find(
        (r) => r.guestName.trim().toLowerCase() === guest.name.toLowerCase()
      )
    : undefined;

  if (rsvpsQuery.isLoading) return null;

  if (myRsvp) {
    const status = STATUS[myRsvp.response as RsvpResponse] ?? STATUS.maybe;
    const Icon = status.icon;
    return (
      <div
        className={`mb-6 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${status.cardClass}`}
        data-testid="rsvp-cta-confirmed"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <Icon className={`h-5 w-5 ${status.iconClass}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              You're RSVP'd: {status.label}
            </p>
            <p className="text-xs text-gray-600">
              Changed your mind? Update your response anytime.
            </p>
          </div>
        </div>
        <RsvpDialog
          eventId={eventId}
          trigger={
            <Button variant="outline" size="sm" data-testid="button-update-rsvp">
              <Pencil className="mr-2 h-4 w-4" />
              Update RSVP
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-blue-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      data-testid="rsvp-cta-prompt"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
          <MailCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">
            Are you coming to {eventTitle}?
          </p>
          <p className="text-sm text-gray-600">
            Let the host know with a quick RSVP — yes, no, or maybe.
          </p>
        </div>
      </div>
      <RsvpDialog
        eventId={eventId}
        trigger={
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90"
            data-testid="button-rsvp-cta"
          >
            <MailCheck className="mr-2 h-4 w-4" />
            RSVP now
          </Button>
        }
      />
    </div>
  );
}
