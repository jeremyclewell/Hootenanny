import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";
import EventHeader from "@/components/event-header";
import AddCustomItem from "@/components/add-custom-item";
import ItemCategories from "@/components/item-categories";
import ClaimItemModal from "@/components/claim-item-modal";
import EditItemModal from "@/components/edit-item-modal";
import PollView from "@/components/poll-view";
import ReopenPollBanner from "@/components/reopen-poll-banner";
import RsvpList from "@/components/rsvp-list";
import RsvpCta from "@/components/rsvp-cta";
import EventDiscussion from "@/components/event-discussion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Hourglass, Utensils } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Event, Item, ItemComment } from "@shared/schema";

export default function EventPage() {
  const { id } = useParams();
  const { lastMessage } = useWebSocket(id || null);
  const { user } = useAuth();

  const eventQuery = useQuery<Event>({
    queryKey: [`/api/events/${id}`],
    enabled: !!id,
    retry: false,
  });

  const event = eventQuery.data;
  const isHost = !!user && !!event && user.id === event.ownerId;
  const isPolling = event?.pollStatus === "polling";
  const isDraft = event?.status === "draft";

  const itemsQuery = useQuery<Item[]>({
    queryKey: [`/api/events/${id}/items`],
    enabled: !!id && !!event,
  });

  const itemCommentsQuery = useQuery<ItemComment[]>({
    queryKey: [`/api/events/${id}/item-comments`],
    enabled: !!id && !!event,
  });

  useEffect(() => {
    if (!lastMessage || !id) return;

    if (["itemClaimed", "itemAdded", "itemDeleted", "itemUpdated", "itemUnclaimed"].includes(lastMessage.type)) {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/items`] });
    }
    if (lastMessage.type === "voteSubmitted") {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/votes`] });
    }
    if (["rsvpSubmitted", "rsvpDeleted"].includes(lastMessage.type)) {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/rsvps`] });
    }
    if (["dateFinalized", "pollReopened", "eventPublished", "eventUnpublished"].includes(lastMessage.type)) {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/votes`] });
    }
    if (lastMessage.type === "candidateDatesUpdated") {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}`] });
    }
    if (["itemCommentAdded", "itemCommentDeleted"].includes(lastMessage.type)) {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/item-comments`] });
    }
    if (["eventCommentAdded", "eventCommentDeleted"].includes(lastMessage.type)) {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${id}/comments`] });
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
    const message = (eventQuery.error as Error | undefined)?.message || "";
    const isDraftHidden = /^403:/.test(message) && /draft|not published/i.test(message);

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md surface-card">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-3 items-center">
              <span className="icon-chip-md bg-terracotta-50">
                {isDraftHidden ? (
                  <Hourglass className="h-5 w-5 text-primary" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </span>
              <h1 className="text-2xl font-serif font-bold text-foreground">
                {isDraftHidden ? "Not published yet" : "Event not found"}
              </h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {isDraftHidden
                ? "The host hasn't published this event yet. Check back later, or ask them to send the link once it's live."
                : "The hootenanny event you're looking for doesn't exist or has been removed."}
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-6 rounded-full">
                <Utensils className="mr-2 h-4 w-4" /> Back to home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = itemsQuery.data || [];
  const allItemComments = itemCommentsQuery.data || [];

  const itemsSection = (
    <div className="mt-8 space-y-4">
      <AddCustomItem eventId={event!.id} />
      <ItemCategories
        items={items}
        eventId={event!.id}
        itemComments={allItemComments}
        isHost={isHost}
      />
    </div>
  );

  // ─── Polling mode ─────────────────────────────────────────────────────────
  if (isPolling) {
    return (
      <div className="min-h-screen relative">
        <EventHeader event={event!} isHost={isHost} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-2xl">
            <PollView event={event!} isHost={isHost} />
          </div>
          {itemsSection}
          <EventDiscussion event={event!} isHost={isHost} />
          <ClaimItemModal />
          <EditItemModal />
        </main>
      </div>
    );
  }

  // ─── Normal mode ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative">
      <EventHeader event={event!} isHost={isHost} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {!isDraft && <RsvpCta eventId={event!.id} eventTitle={event!.title} />}
        {isHost && event!.pollStatus === "finalized" && <ReopenPollBanner event={event!} />}
        {!isDraft && <RsvpList eventId={event!.id} isHost={isHost} />}
        {itemsSection}
        <EventDiscussion event={event!} isHost={isHost} />
        <ClaimItemModal />
        <EditItemModal />
      </main>
    </div>
  );
}
