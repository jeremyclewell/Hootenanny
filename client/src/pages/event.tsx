import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import EventHeader from "@/components/event-header";
import MapBackground from "@/components/map-banner";
import AddCustomItem from "@/components/add-custom-item";
import ItemCategories from "@/components/item-categories";
import ClaimItemModal from "@/components/claim-item-modal";
import EditItemModal from "@/components/edit-item-modal";
import PollView from "@/components/poll-view";
import ReopenPollBanner from "@/components/reopen-poll-banner";
import RsvpList from "@/components/rsvp-list";
import RsvpCta from "@/components/rsvp-cta";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import type { Event, Item } from "@shared/schema";

export default function EventPage() {
  const { id } = useParams();
  const { lastMessage } = useWebSocket(id || null);

  const [hostToken, setHostToken] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    try {
      setHostToken(localStorage.getItem(`hootenanny-host-${id}`));
    } catch {
      setHostToken(null);
    }
  }, [id]);

  const eventQuery = useQuery<Event>({
    queryKey: [`/api/events/${id}`],
    enabled: !!id,
  });

  const isPolling = eventQuery.data?.pollStatus === "polling";
  const isHost = !!hostToken;

  const itemsQuery = useQuery<Item[]>({
    queryKey: [`/api/events/${id}/items`],
    enabled: !!id && !isPolling,
  });

  useEffect(() => {
    if (!lastMessage || !id) return;
    if (
      lastMessage.type === "itemClaimed" ||
      lastMessage.type === "itemAdded" ||
      lastMessage.type === "itemDeleted" ||
      lastMessage.type === "itemUpdated" ||
      lastMessage.type === "itemUnclaimed"
    ) {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/items`] });
    }
    if (lastMessage.type === "voteSubmitted") {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/votes`] });
    }
    if (lastMessage.type === "rsvpSubmitted" || lastMessage.type === "rsvpDeleted") {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/rsvps`] });
    }
    if (lastMessage.type === "dateFinalized" || lastMessage.type === "pollReopened") {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/votes`] });
    }
    if (lastMessage.type === "candidateDatesUpdated") {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
    }
  }, [lastMessage, id]);

  if (eventQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border h-16 shadow-warm" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-32 w-full mb-8 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (eventQuery.error || !eventQuery.data) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4 shadow-warm border-border">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-3">
              <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
              <h1 className="text-2xl font-serif font-bold text-foreground">Event Not Found</h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              The hootenanny event you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const event = eventQuery.data;
  const items = itemsQuery.data || [];

  // ─── Polling mode: date not yet confirmed ────────────────────────────────
  // Show only the event header and the date poll. Nothing else is actionable
  // until the host locks in a date.
  if (isPolling) {
    return (
      <>
        {event.location && <MapBackground location={event.location} />}
        <div className="min-h-screen relative" style={{ zIndex: 1 }}>
          <EventHeader event={event} />
          <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
            <PollView event={event} isHost={isHost} hostToken={hostToken} />
          </main>
        </div>
      </>
    );
  }

  // ─── Normal mode: date confirmed (or optional date, no poll) ─────────────
  return (
    <>
      {event.location && <MapBackground location={event.location} />}

      <div className="min-h-screen relative" style={{ zIndex: 1 }}>
        <EventHeader event={event} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <RsvpCta eventId={event.id} eventTitle={event.title} />

          {isHost && event.pollStatus === "finalized" && (
            <ReopenPollBanner event={event} hostToken={hostToken} />
          )}

          <RsvpList eventId={event.id} isHost={isHost} hostToken={hostToken} />

          <div className="mt-8 space-y-4">
            <AddCustomItem eventId={event.id} />
            <ItemCategories items={items} eventId={event.id} />
          </div>

          <ClaimItemModal />
          <EditItemModal />
        </main>
      </div>
    </>
  );
}
