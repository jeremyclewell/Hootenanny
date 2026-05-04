import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import EventHeader from "@/components/event-header";
import MapBanner from "@/components/map-banner";
import QuickStats from "@/components/quick-stats";
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
import type { Event, Item, Rsvp } from "@shared/schema";

type PublicRsvp = Omit<Rsvp, "guestEmail">;

interface EventStats {
  total: number;
  claimed: number;
  available: number;
  custom: number;
}

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
  const isHostView = !!hostToken;

  const itemsQuery = useQuery<Item[]>({
    queryKey: [`/api/events/${id}/items`],
    enabled: !!id && (!isPolling || isHostView),
  });

  const statsQuery = useQuery<EventStats>({
    queryKey: [`/api/events/${id}/stats`],
    enabled: !!id && (!isPolling || isHostView),
  });

  const rsvpsQuery = useQuery<PublicRsvp[]>({
    queryKey: [`/api/events/${id}/rsvps`],
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
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/stats`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/stats`] });
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
  const stats = statsQuery.data || { total: 0, claimed: 0, available: 0, custom: 0 };
  const rsvps = rsvpsQuery.data || [];
  const rsvpStats = {
    going: rsvps.filter((r) => r.response === "yes").length,
    maybe: rsvps.filter((r) => r.response === "maybe").length,
  };
  const isHost = isHostView;

  return (
    <div className="min-h-screen bg-background">
      {/* Map banner sits at the top — the sticky nav scrolls over it */}
      {event.location && <MapBanner location={event.location} />}

      <EventHeader event={event} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {isPolling ? (
          <div className="space-y-8">
            <PollView event={event} isHost={isHost} hostToken={hostToken} />
            {isHost && (
              <section className="space-y-4">
                <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
                  <h3 className="font-serif font-semibold text-foreground mb-1">
                    Set up your menu while you wait
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add, edit, or remove food and drink items now — guests will be able to claim
                    them as soon as you lock in a date.
                  </p>
                </div>
                <AddCustomItem eventId={event.id} />
                <ItemCategories items={items} eventId={event.id} />
              </section>
            )}
          </div>
        ) : (
          <>
            <RsvpCta eventId={event.id} eventTitle={event.title} />
            {isHost && event.pollStatus === "finalized" && (
              <ReopenPollBanner event={event} hostToken={hostToken} />
            )}
            <QuickStats stats={stats} rsvpStats={rsvpStats} />
            <RsvpList eventId={event.id} isHost={isHost} hostToken={hostToken} />
            <AddCustomItem eventId={event.id} />
            <ItemCategories items={items} eventId={event.id} />
            <ClaimItemModal />
            <EditItemModal />
          </>
        )}
      </main>
    </div>
  );
}
