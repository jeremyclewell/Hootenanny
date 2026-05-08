import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, HelpCircle, X, Mail, Trash2, Minus, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Event, Rsvp, RsvpResponse } from "@shared/schema";

interface RsvpDialogProps {
  eventId: string;
  trigger: React.ReactNode;
}

const STORAGE_KEY = "hootenanny-voter";
type PublicRsvp = Omit<Rsvp, "guestEmail">;
interface StoredGuest { name: string; email: string; }

function loadStoredGuest(): StoredGuest {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { name: parsed.name || "", email: parsed.email || "" };
    }
  } catch {}
  return { name: "", email: "" };
}

const RESPONSE_OPTIONS: Array<{
  value: RsvpResponse;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultIconBg: string;
  defaultIconColor: string;
  selectedIconBg: string;
  selectedBorder: string;
  selectedBg: string;
}> = [
  {
    value: "yes",
    label: "Yes, I'll be there",
    icon: Check,
    defaultIconBg: "bg-sage-100",
    defaultIconColor: "text-sage-600",
    selectedIconBg: "bg-sage-500 text-white",
    selectedBorder: "border-sage-400",
    selectedBg: "bg-sage-50",
  },
  {
    value: "maybe",
    label: "Maybe — I'll try to make it",
    icon: HelpCircle,
    defaultIconBg: "bg-sand-100",
    defaultIconColor: "text-sand-600",
    selectedIconBg: "bg-sand-400 text-white",
    selectedBorder: "border-sand-400",
    selectedBg: "bg-sand-50",
  },
  {
    value: "no",
    label: "Can't make it this time",
    icon: X,
    defaultIconBg: "bg-terracotta-50",
    defaultIconColor: "text-primary",
    selectedIconBg: "bg-primary text-white",
    selectedBorder: "border-primary",
    selectedBg: "bg-terracotta-50",
  },
];

const MAX_PLUS_ONES = 10;

export default function RsvpDialog({ eventId, trigger }: RsvpDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [guest, setGuest] = useState<StoredGuest>({ name: "", email: "" });
  const [response, setResponse] = useState<RsvpResponse | null>(null);
  const [plusOnes, setPlusOnes] = useState(0);

  useEffect(() => {
    if (open) {
      setGuest(loadStoredGuest());
      setResponse(null);
      setPlusOnes(0);
    }
  }, [open]);

  const eventQuery = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: open,
  });

  const rsvpsQuery = useQuery<PublicRsvp[]>({
    queryKey: [`/api/events/${eventId}/rsvps`],
    enabled: open,
  });

  const myRsvp = useMemo(() => {
    const name = guest.name.trim().toLowerCase();
    if (!name) return undefined;
    const matches = (rsvpsQuery.data || []).filter(
      (r) => r.guestName.trim().toLowerCase() === name
    );
    return matches.length === 1 ? matches[0] : undefined;
  }, [rsvpsQuery.data, guest.name]);

  // Pre-populate from existing RSVP
  useEffect(() => {
    if (myRsvp) {
      if (response === null) setResponse(myRsvp.response as RsvpResponse);
      setPlusOnes(myRsvp.plusOnes ?? 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myRsvp?.id]);

  const submit = useMutation({
    mutationFn: async (chosen: RsvpResponse) => {
      const payload: {
        guestName: string;
        response: RsvpResponse;
        plusOnes: number;
        guestEmail?: string;
      } = {
        guestName: guest.name.trim(),
        response: chosen,
        plusOnes,
      };
      const trimmedEmail = guest.email.trim();
      if (trimmedEmail) payload.guestEmail = trimmedEmail;
      const res = await apiRequest("POST", `/api/events/${eventId}/rsvps`, payload);
      return res.json();
    },
    onSuccess: (_data, chosen) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: guest.name.trim(), email: guest.email.trim() }));
      } catch {}
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/rsvps`] });
      const label = RESPONSE_OPTIONS.find((o) => o.value === chosen)?.label ?? "RSVP";
      toast({ title: "RSVP saved!", description: `You're marked as: ${label}.` });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({ title: "Could not save RSVP", description: message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!myRsvp) throw new Error("No RSVP to remove");
      const payload: { guestName: string; guestEmail?: string } = { guestName: guest.name.trim() };
      const trimmedEmail = guest.email.trim();
      if (trimmedEmail) payload.guestEmail = trimmedEmail;
      const res = await apiRequest("DELETE", `/api/events/${eventId}/rsvps/${myRsvp.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/rsvps`] });
      toast({ title: "RSVP removed", description: "You're no longer on the attendee list." });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({ title: "Could not remove RSVP", description: message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!guest.name.trim()) {
      toast({ title: "Name required", description: "Please enter your name first.", variant: "destructive" });
      return;
    }
    if (!response) {
      toast({ title: "Pick a response", description: "Let the host know if you're coming.", variant: "destructive" });
      return;
    }
    submit.mutate(response);
  };

  const busy = submit.isPending || remove.isPending;
  const eventTitle = eventQuery.data?.title;
  const ctaLabel = response === "yes" ? "I'm in! 🎉" : "Save my RSVP";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start gap-3 pr-12">
            <span className="icon-chip-md bg-terracotta-100">
              <Mail className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-serif text-2xl font-bold text-foreground leading-tight">
                Are you coming?
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                Let the host know if you'll make{" "}
                {eventTitle
                  ? <span className="font-medium text-foreground">{eventTitle}</span>
                  : "this hootenanny"
                }. You can change your response anytime.
              </DialogDescription>
            </div>
          </div>
          <span className="absolute right-16 top-7 text-sage-400 text-sm" aria-hidden>✦</span>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name + Email */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rsvp-name" className="text-sm font-semibold text-foreground">
                Your name
              </Label>
              <Input
                id="rsvp-name"
                value={guest.name}
                onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                placeholder="Alex Smith"
                required
                data-testid="input-rsvp-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rsvp-email" className="text-sm font-semibold text-foreground">
                Email <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="rsvp-email"
                type="email"
                value={guest.email}
                onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                placeholder="alex@example.com"
                data-testid="input-rsvp-email"
              />
            </div>
          </div>

          {/* Response options */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Will you be there?</Label>
            <div className="space-y-2">
              {RESPONSE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = response === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid={`rsvp-option-${opt.value}`}
                    onClick={() => setResponse(opt.value)}
                    disabled={busy}
                    className={cn(
                      "relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all disabled:opacity-60",
                      isSelected
                        ? `${opt.selectedBorder} ${opt.selectedBg}`
                        : "border-border/60 bg-card hover:border-sand-300"
                    )}
                  >
                    <span className={cn(
                      "icon-chip-sm transition-colors",
                      isSelected ? opt.selectedIconBg : opt.defaultIconBg
                    )}>
                      <Icon className={cn("h-4 w-4", isSelected ? "" : opt.defaultIconColor)} />
                    </span>
                    <span className="text-base font-medium text-foreground flex-1">{opt.label}</span>
                    {isSelected && (
                      <span className="text-foreground/70 text-sm shrink-0" aria-hidden>✦</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plus-ones stepper — only shown when attending (yes or maybe) */}
          {(response === "yes" || response === "maybe") && (
            <div className="flex items-center gap-4 surface-callout border-border/60 bg-muted/40 px-4 py-3">
              <span className="icon-chip-sm bg-sand-100">
                <Users className="h-4 w-4 text-sand-600" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">Bringing anyone?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plusOnes === 0
                    ? "Just you — tap + to add guests"
                    : `+${plusOnes} guest${plusOnes === 1 ? "" : "s"} alongside you`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  aria-label="Remove a guest"
                  disabled={plusOnes === 0 || busy}
                  onClick={() => setPlusOnes((n) => Math.max(0, n - 1))}
                  className={cn(
                    "w-8 h-8 rounded-full border border-border/60 bg-card flex items-center justify-center transition-colors",
                    "hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  <Minus className="h-3.5 w-3.5 text-foreground" />
                </button>
                <span className="w-5 text-center text-base font-semibold tabular-nums text-foreground">
                  {plusOnes}
                </span>
                <button
                  type="button"
                  aria-label="Add a guest"
                  disabled={plusOnes >= MAX_PLUS_ONES || busy}
                  onClick={() => setPlusOnes((n) => Math.min(MAX_PLUS_ONES, n + 1))}
                  className={cn(
                    "w-8 h-8 rounded-full border border-border/60 bg-card flex items-center justify-center transition-colors",
                    "hover:bg-muted focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  )}
                >
                  <Plus className="h-3.5 w-3.5 text-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Footer copy */}
          <p className="text-center text-xs text-muted-foreground">
            We'll only use your email to send updates about this event.
          </p>

          {/* CTA */}
          <Button
            type="button"
            onClick={handleSave}
            disabled={busy || !response}
            className="w-full bg-primary hover:bg-primary/90 rounded-full h-12 text-base font-medium shadow-sm"
            data-testid="button-save-rsvp"
          >
            {submit.isPending ? "Saving…" : ctaLabel}
          </Button>

          {/* Remove existing RSVP */}
          {myRsvp && (
            <div className="border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove.mutate()}
                disabled={busy}
                data-testid="button-remove-my-rsvp"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {remove.isPending ? "Removing…" : "Remove my RSVP"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
