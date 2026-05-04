import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, HelpCircle, X, UserCheck, UserX } from "lucide-react";
import type { Rsvp, DateVote, Item } from "@shared/schema";

interface RsvpListProps {
  eventId: string;
  isHost: boolean;
}

type PublicRsvp = Omit<Rsvp, "guestEmail">;
type PublicVote = Omit<DateVote, "voterEmail">;

const GROUPS: Array<{
  key: "yes" | "maybe" | "no";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  iconClass: string;
}> = [
  {
    key: "yes",
    title: "Going",
    icon: Check,
    badgeClass: "bg-green-100 text-green-800",
    iconClass: "text-green-600",
  },
  {
    key: "maybe",
    title: "Maybe",
    icon: HelpCircle,
    badgeClass: "bg-amber-100 text-amber-800",
    iconClass: "text-amber-600",
  },
  {
    key: "no",
    title: "Can't make it",
    icon: X,
    badgeClass: "bg-red-100 text-red-800",
    iconClass: "text-red-600",
  },
];

function normalize(name: string) {
  return name.trim().toLowerCase();
}

export default function RsvpList({ eventId, isHost }: RsvpListProps) {
  const rsvpsQuery = useQuery<PublicRsvp[]>({
    queryKey: [`/api/events/${eventId}/rsvps`],
  });

  const votesQuery = useQuery<PublicVote[]>({
    queryKey: [`/api/events/${eventId}/votes`],
    enabled: isHost,
  });

  const itemsQuery = useQuery<Item[]>({
    queryKey: [`/api/events/${eventId}/items`],
    enabled: isHost,
  });

  const rsvps = rsvpsQuery.data || [];

  const grouped = GROUPS.map((g) => ({
    ...g,
    people: rsvps.filter((r) => r.response === g.key),
  }));

  const respondedNames = new Set(rsvps.map((r) => normalize(r.guestName)));

  const seenInEvent = new Set<string>();
  if (isHost) {
    for (const v of votesQuery.data || []) {
      if (v.voterName) seenInEvent.add(normalize(v.voterName));
    }
    for (const i of itemsQuery.data || []) {
      if (i.claimedBy) seenInEvent.add(normalize(i.claimedBy));
    }
  }
  const missingNames = isHost
    ? Array.from(seenInEvent)
        .filter((n) => !respondedNames.has(n))
        .map((n) => {
          const fromVote = (votesQuery.data || []).find((v) => normalize(v.voterName) === n);
          if (fromVote) return fromVote.voterName;
          const fromItem = (itemsQuery.data || []).find(
            (i) => i.claimedBy && normalize(i.claimedBy) === n
          );
          return fromItem?.claimedBy || n;
        })
        .sort((a, b) => a.localeCompare(b))
    : [];

  if (rsvpsQuery.isLoading) {
    return <Skeleton className="mb-8 h-48 w-full" />;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          Who's coming
        </CardTitle>
        <CardDescription>
          {rsvps.length === 0
            ? "No RSVPs yet. Be the first to let the host know!"
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
                className="rounded-lg border border-gray-200 bg-white p-4"
                data-testid={`rsvp-group-${group.key}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${group.iconClass}`} />
                    <span className="text-sm font-semibold text-gray-900">{group.title}</span>
                  </div>
                  <span
                    className={`inline-flex min-w-[1.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-medium ${group.badgeClass}`}
                  >
                    {group.people.length}
                  </span>
                </div>
                {group.people.length === 0 ? (
                  <p className="text-xs text-gray-500">No one yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {group.people.map((p) => (
                      <li
                        key={p.id}
                        className="truncate text-sm text-gray-700"
                        data-testid={`rsvp-name-${p.id}`}
                      >
                        {p.guestName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {isHost && missingNames.length > 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <UserX className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">
                Haven't responded yet
              </span>
              <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                {missingNames.length}
              </span>
            </div>
            <p className="mb-2 text-xs text-gray-600">
              Guests we've seen on this event (voted on a date or claimed an item) but who
              haven't RSVPed yet.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missingNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-700 ring-1 ring-gray-200"
                  data-testid={`rsvp-missing-${name}`}
                >
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
