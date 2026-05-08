import { useMutation, useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, X, Users, UserX, Trash2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Rsvp, DateVote, Item } from "@shared/schema";
import { useState } from "react";

interface RsvpListProps {
  eventId: string;
  isHost: boolean;
  hostToken?: string | null;
}

type PublicRsvp = Omit<Rsvp, "guestEmail">;
type PublicVote = Omit<DateVote, "voterEmail">;

const GROUPS: Array<{
  key: "yes" | "maybe" | "no";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  cardBg: string;
  iconBg: string;
  iconFg: string;
  ink: string;
  countRing: string;
}> = [
  {
    key: "yes",
    title: "Going",
    icon: Check,
    cardBg: "bg-sage-50 border-sage-100",
    iconBg: "bg-sage-100",
    iconFg: "text-sage-600",
    ink: "text-sage-700",
    countRing: "text-sage-700",
  },
  {
    key: "maybe",
    title: "Maybe",
    icon: HelpCircle,
    cardBg: "bg-sand-100 border-sand-200",
    iconBg: "bg-sand-200",
    iconFg: "text-sand-600",
    ink: "text-sand-600",
    countRing: "text-sand-600",
  },
  {
    key: "no",
    title: "Can't make it",
    icon: X,
    cardBg: "bg-terracotta-50 border-terracotta-100",
    iconBg: "bg-terracotta-100",
    iconFg: "text-primary",
    ink: "text-terracotta-700",
    countRing: "text-terracotta-700",
  },
];

function normalize(name: string) { return name.trim().toLowerCase(); }

export default function RsvpList({ eventId, isHost, hostToken }: RsvpListProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const rsvpsQuery = useQuery<PublicRsvp[]>({ queryKey: [`/api/events/${eventId}/rsvps`] });
  const votesQuery = useQuery<PublicVote[]>({ queryKey: [`/api/events/${eventId}/votes`], enabled: isHost });
  const itemsQuery = useQuery<Item[]>({ queryKey: [`/api/events/${eventId}/items`], enabled: isHost });

  const deleteRsvpMutation = useMutation({
    mutationFn: async (rsvpId: number) => {
      await apiRequest("DELETE", `/api/events/${eventId}/rsvps/${rsvpId}`, { hostToken });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/rsvps`] });
      toast({ title: "RSVP removed" });
    },
    onError: () => toast({ title: "Could not remove RSVP", variant: "destructive" }),
  });

  const rsvps = rsvpsQuery.data || [];
  const grouped = GROUPS.map((g) => ({ ...g, people: rsvps.filter((r) => r.response === g.key) }));
  const respondedNames = new Set(rsvps.map((r) => normalize(r.guestName)));

  const seenInEvent = new Set<string>();
  if (isHost) {
    for (const v of votesQuery.data || []) if (v.voterName) seenInEvent.add(normalize(v.voterName));
    for (const i of itemsQuery.data || []) if (i.claimedBy) seenInEvent.add(normalize(i.claimedBy));
  }
  const missingNames = isHost
    ? Array.from(seenInEvent)
        .filter((n) => !respondedNames.has(n))
        .map((n) => {
          const fromVote = (votesQuery.data || []).find((v) => normalize(v.voterName) === n);
          if (fromVote) return fromVote.voterName;
          const fromItem = (itemsQuery.data || []).find((i) => i.claimedBy && normalize(i.claimedBy) === n);
          return fromItem?.claimedBy || n;
        })
        .sort((a, b) => a.localeCompare(b))
    : [];

  if (rsvpsQuery.isLoading) return <Skeleton className="mb-8 mt-6 h-48 w-full rounded-2xl" />;

  return (
    <div className="surface-card mb-6 mt-6 p-6" data-testid="rsvp-list">
      {/* Section header row */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="icon-chip-md bg-terracotta-50">
          <Users className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">Who's coming</p>
          <p className="text-sm text-muted-foreground">
            {rsvps.length === 0
              ? "No RSVPs yet — be the first to let the host know!"
              : `${grouped[0].people.length} going · ${grouped[1].people.length} maybe · ${grouped[2].people.length} can't make it`}
          </p>
        </div>
        {rsvps.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setExpanded((v) => !v)}
            data-testid="button-view-all-rsvps"
          >
            {expanded ? "Hide names" : "View all RSVPs"}
            <ChevronRight className={`ml-1 h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </Button>
        )}
      </div>

      {/* 3 horizontal status cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {grouped.map((group) => {
          const Icon = group.icon;
          const names = group.people.slice(0, 3).map((p) => p.guestName).join(", ");
          const extra = group.people.length > 3 ? ` +${group.people.length - 3}` : "";
          return (
            <div
              key={group.key}
              className={`flex items-center gap-3 rounded-2xl border p-4 ${group.cardBg}`}
              data-testid={`rsvp-group-${group.key}`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${group.iconBg}`}>
                <Icon className={`h-5 w-5 ${group.iconFg}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{group.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {group.people.length === 0 ? "No one yet" : `${names}${extra}`}
                </p>
              </div>
              <div className={`text-2xl font-semibold tabular-nums ${group.countRing}`}>
                {group.people.length}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded names list */}
      {expanded && rsvps.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {grouped.map((group) => (
            <div key={`names-${group.key}`} className="rounded-xl border border-border bg-background/60 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </p>
              {group.people.length === 0 ? (
                <p className="text-xs text-muted-foreground">No one yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {group.people.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-1" data-testid={`rsvp-name-${p.id}`}>
                      <span className="truncate text-sm text-foreground">{p.guestName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {p.plusOnes > 0 && (
                          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                            +{p.plusOnes}
                          </span>
                        )}
                        {isHost && (
                          <button
                            onClick={() => {
                              if (!window.confirm(`Remove ${p.guestName}'s RSVP?`)) return;
                              deleteRsvpMutation.mutate(p.id);
                            }}
                            disabled={deleteRsvpMutation.isPending}
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                            title="Remove RSVP"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {isHost && missingNames.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-sand-200 bg-sand-100 p-4">
          <div className="mb-2 flex items-center gap-2">
            <UserX className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Haven't responded</span>
            <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-sand-200 px-2 py-0.5 text-xs font-medium text-sand-600">
              {missingNames.length}
            </span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Seen on this event (voted or claimed an item) but haven't RSVPed yet.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingNames.map((name) => (
              <span key={name} className="rounded-full bg-card px-2.5 py-0.5 text-xs text-foreground ring-1 ring-border" data-testid={`rsvp-missing-${name}`}>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
