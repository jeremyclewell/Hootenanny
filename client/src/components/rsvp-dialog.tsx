import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, HelpCircle, X, MailCheck } from "lucide-react";
import type { RsvpResponse } from "@shared/schema";

interface RsvpDialogProps {
  eventId: string;
  trigger: React.ReactNode;
}

const STORAGE_KEY = "hootenanny-voter";

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

  const submit = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${eventId}/rsvps`, {
        guestName: guest.name,
        guestEmail: guest.email,
        response,
      });
      return res.json();
    },
    onSuccess: () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(guest));
      } catch {}
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/rsvps`] });
      toast({
        title: "RSVP saved!",
        description: "Thanks for letting the host know.",
      });
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Could not save RSVP",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name first.",
        variant: "destructive",
      });
      return;
    }
    if (!response) {
      toast({
        title: "Pick a response",
        description: "Let the host know if you're coming.",
        variant: "destructive",
      });
      return;
    }
    submit.mutate();
  };

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
        <form onSubmit={handleSubmit} className="space-y-4">
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
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-selected={selected}
                    data-testid={`rsvp-option-${opt.value}`}
                    onClick={() => setResponse(opt.value)}
                    className={`flex items-center gap-3 rounded-md border p-3 text-left text-sm font-medium transition ${opt.classes}`}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={submit.isPending}
              data-testid="button-submit-rsvp"
            >
              {submit.isPending ? "Saving..." : "Save RSVP"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
