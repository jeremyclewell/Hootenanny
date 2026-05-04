import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import EventHeader from "@/components/event-header";
import QuickStats from "@/components/quick-stats";
import AddCustomItem from "@/components/add-custom-item";
import ItemCategories from "@/components/item-categories";
import ClaimItemModal from "@/components/claim-item-modal";
import EditItemModal from "@/components/edit-item-modal";
import PollView from "@/components/poll-view";
import ReopenPollBanner from "@/components/reopen-poll-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import type { Event, Item } from "@shared/schema";

interface EventStats {
  total: number;
  claimed: number;
  available: number;
  custom: number;
}

export default function Event() {
  const { id } = useParams();
  const { lastMessage } = useWebSocket(id || null);

  // Read the host token (if any) for this event from localStorage
  const [hostToken, setHostToken] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    try {
      setHostToken(localStorage.getItem(`hootenanny-host-${id}`));
    } catch {
      setHostToken(null);
    }
  }, [id]);

  // Queries
  const eventQuery = useQuery<Event>({
    queryKey: [`/api/events/${id}`],
    enabled: !!id,
  });

  const isPolling = eventQuery.data?.pollStatus === "polling";

  const itemsQuery = useQuery<Item[]>({
    queryKey: [`/api/events/${id}/items`],
    enabled: !!id && !isPolling,
  });

  const statsQuery = useQuery<EventStats>({
    queryKey: [`/api/events/${id}/stats`],
    enabled: !!id && !isPolling,
  });

  // Handle WebSocket updates
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-200 h-16" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-32 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  if (eventQuery.error || !eventQuery.data) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Event Not Found</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
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
  const isHost = !!hostToken;

  return (
    <div className="min-h-screen bg-gray-50">
      <EventHeader event={event} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isPolling ? (
          <PollView event={event} isHost={isHost} hostToken={hostToken} />
        ) : (
          <>
            {isHost && event.pollStatus === "finalized" && (
              <ReopenPollBanner event={event} hostToken={hostToken} />
            )}
            <QuickStats stats={stats} />
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
