import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, X, UserCheck, UserX, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Rsvp, DateVote, Item } from "@shared/schema";

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
  headerClass: string;
  iconClass: string;
  badgeClass: string;
}> = [
  { key: "yes",   title: "Going",          icon: Check,       headerClass: "bg-sage-50 border-sage-100",       iconClass: "text-sage-600",  badgeClass: "bg-sage-100 text-sage-700" },
  { key: "maybe", title: "Maybe",          icon: HelpCircle,  headerClass: "bg-sand-100 border-sand-200",     iconClass: "text-sand-600",  badgeClass: "bg-sand-200 text-sand-600" },
  { key: "no",    title: "Can't make it",  icon: X,           headerClass: "bg-terracotta-50 border-terracotta-100", iconClass: "text-primary", badgeClass: "bg-terracotta-100 text-primary" },
];

function normalize(name: string) { return name.trim().toLowerCase(); }

export default function RsvpList({ eventId, isHost, hostToken }: RsvpListProps) {
  const { toast } = useToast();

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

  if (rsvpsQuery.isLoading) return <Skeleton className="mb-8 h-48 w-full" />;

  return (
    <Card className="mb-8 shadow-warm border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif">
          <UserCheck className="h-5 w-5 text-primary" />
          Who's coming
        </CardTitle>
        <CardDescription>
          {rsvps.length === 0
            ? "No RSVPs yet — be the first to let the host know!"
            : `${grouped[0].people.length} going · ${grouped[1].people.length} maybe · ${grouped[2].people.length} can't make it`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {grouped.map((group) => {
            const Icon = group.icon;
            return (
              <div
                key={group.key}
                className={`rounded-xl border p-4 ${group.headerClass}`}
                data-testid={`rsvp-group-${group.key}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${group.iconClass}`} />
                    <span className="text-sm font-semibold text-foreground">{group.title}</span>
                  </div>
                  <span className={`inline-flex min-w-[1.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-medium ${group.badgeClass}`}>
                    {group.people.length}
                  </span>
                </div>
                {group.people.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No one yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {group.people.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-1" data-testid={`rsvp-name-${p.id}`}>
                        <span className="truncate text-sm text-foreground">{p.guestName}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {p.plusOnes > 0 && (
                            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
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
                              className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
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
            );
          })}
        </div>

        {isHost && missingNames.length > 0 && (
          <div className="rounded-xl border border-dashed border-sand-200 bg-sand-100 p-4">
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
      </CardContent>
    </Card>
  );
}
