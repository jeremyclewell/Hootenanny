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
import { Check, HelpCircle, X, MailCheck, Trash2 } from "lucide-react";
import type { Rsvp, RsvpResponse } from "@shared/schema";

interface RsvpDialogProps {
  eventId: string;
  trigger: React.ReactNode;
}

const STORAGE_KEY = "hootenanny-voter";

type PublicRsvp = Omit<Rsvp, "guestEmail">;

interface StoredGuest {
  name: string;
  email: string;
}

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
  classes: string;
}> = [
  {
    value: "yes",
    label: "Yes, I'll be there",
    icon: Check,
    classes:
      "border-green-300 bg-green-50 text-green-800 hover:bg-green-100 data-[selected=true]:bg-green-600 data-[selected=true]:text-white data-[selected=true]:border-green-600",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: HelpCircle,
    classes:
      "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 data-[selected=true]:bg-amber-500 data-[selected=true]:text-white data-[selected=true]:border-amber-500",
  },
  {
    value: "no",
    label: "Can't make it",
    icon: X,
    classes:
      "border-red-300 bg-red-50 text-red-800 hover:bg-red-100 data-[selected=true]:bg-red-600 data-[selected=true]:text-white data-[selected=true]:border-red-600",
  },
];

export default function RsvpDialog({ eventId, trigger }: RsvpDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [guest, setGuest] = useState<StoredGuest>({ name: "", email: "" });
  const [response, setResponse] = useState<RsvpResponse | null>(null);

  useEffect(() => {
    if (open) {
      setGuest(loadStoredGuest());
      setResponse(null);
    }
  }, [open]);

  const rsvpsQuery = useQuery<PublicRsvp[]>({
    queryKey: [`/api/events/${eventId}/rsvps`],
    enabled: open,
  });

  // The public RSVP list omits emails, so we can only match by name.
  // To avoid offering "Remove my RSVP" against the wrong entry when two
  // guests share a name, only surface removal when the name match is
  // unambiguous (exactly one RSVP). The server still re-validates the
  // owner using name + email before deleting.
  const myRsvp = useMemo(() => {
    const name = guest.name.trim().toLowerCase();
    if (!name) return undefined;
    const matches = (rsvpsQuery.data || []).filter(
      (r) => r.guestName.trim().toLowerCase() === name
    );
    return matches.length === 1 ? matches[0] : undefined;
  }, [rsvpsQuery.data, guest.name]);

  const submit = useMutation({
    mutationFn: async (chosen: RsvpResponse) => {
      const payload: { guestName: string; response: RsvpResponse; guestEmail?: string } = {
        guestName: guest.name.trim(),
        response: chosen,
      };
      const trimmedEmail = guest.email.trim();
      if (trimmedEmail) payload.guestEmail = trimmedEmail;
      const res = await apiRequest("POST", `/api/events/${eventId}/rsvps`, payload);
      return res.json();
    },
    onSuccess: (_data, chosen) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ name: guest.name.trim(), email: guest.email.trim() })
        );
      } catch {}
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/rsvps`] });
      const label = RESPONSE_OPTIONS.find((o) => o.value === chosen)?.label ?? "RSVP";
      toast({
        title: "RSVP saved!",
        description: `You're marked as: ${label}.`,
      });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({
        title: "Could not save RSVP",
        description: message,
        variant: "destructive",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!myRsvp) throw new Error("No RSVP to remove");
      const payload: { guestName: string; guestEmail?: string } = {
        guestName: guest.name.trim(),
      };
      const trimmedEmail = guest.email.trim();
      if (trimmedEmail) payload.guestEmail = trimmedEmail;
      const res = await apiRequest(
        "DELETE",
        `/api/events/${eventId}/rsvps/${myRsvp.id}`,
        payload
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/rsvps`] });
      toast({
        title: "RSVP removed",
        description: "You're no longer on the attendee list.",
      });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({
        title: "Could not remove RSVP",
        description: message,
        variant: "destructive",
      });
    },
  });

  const tryPick = (chosen: RsvpResponse) => {
    if (!guest.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name first.",
        variant: "destructive",
      });
      return;
    }
    setResponse(chosen);
    submit.mutate(chosen);
  };

  const busy = submit.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailCheck className="h-5 w-5 text-primary" />
            RSVP to this hootenanny
          </DialogTitle>
          <DialogDescription>
            Let the host know if you're coming. You can update your response anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rsvp-name">Your name</Label>
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
            <Label htmlFor="rsvp-email">Email (optional)</Label>
            <Input
              id="rsvp-email"
              type="email"
              value={guest.email}
              onChange={(e) => setGuest({ ...guest, email: e.target.value })}
              placeholder="alex@example.com"
              data-testid="input-rsvp-email"
            />
          </div>
          <div className="space-y-2">
            <Label>Will you be there?</Label>
            <div className="grid grid-cols-1 gap-2">
              {RESPONSE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = response === opt.value;
                const isPending = submit.isPending && selected;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-selected={selected}
                    data-testid={`rsvp-option-${opt.value}`}
                    onClick={() => tryPick(opt.value)}
                    disabled={busy}
                    className={`flex items-center gap-3 rounded-md border p-3 text-left text-sm font-medium transition disabled:opacity-60 ${opt.classes}`}
                  >
                    <Icon className="h-4 w-4" />
                    {isPending ? "Saving..." : opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              Tap a response to save it instantly. You can change it anytime.
            </p>
          </div>

          {myRsvp && (
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-center text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => remove.mutate()}
                disabled={busy}
                data-testid="button-remove-my-rsvp"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {remove.isPending ? "Removing..." : "Remove my RSVP"}
              </Button>
              <p className="mt-1 text-center text-xs text-gray-500">
                Takes you off the attendee list entirely.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
