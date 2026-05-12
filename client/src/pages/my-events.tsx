import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, MapPin, Plus, Trash2, Utensils, ArrowRight, Users, Hourglass, MessageSquare } from "lucide-react";
import AuthButton from "@/components/auth-button";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/calendar";
import type { Event } from "@shared/schema";

export default function MyEvents() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const eventsQuery = useQuery<Event[]>({
    queryKey: ["/api/my/events"],
    enabled: isAuthenticated,
  });

  const commentCountsQuery = useQuery<Record<string, number>>({
    queryKey: ["/api/my/events/comment-counts"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my/events/comment-counts"] });
      toast({ title: "Event deleted" });
    },
    onError: () => {
      toast({ title: "Could not delete", variant: "destructive" });
    },
  });

  const events = eventsQuery.data || [];
  const commentCounts = commentCountsQuery.data || {};

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-warm">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="icon-chip-sm bg-coral-gradient">
              <Utensils className="text-white h-4 w-4" />
            </div>
            <span className="font-serif text-lg font-semibold text-foreground">Hootenanny</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/create">
              <Button size="sm" className="rounded-full bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white">
                <Plus className="sm:mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">New event</span>
              </Button>
            </Link>
            <AuthButton hideMyEvents />
          </div>
        </nav>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">My events</h1>
            <p className="mt-1 text-muted-foreground">Drafts only you can see, plus everything you've published.</p>
          </div>
        </div>

        {(authLoading || eventsQuery.isLoading) && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        )}

        {!authLoading && !eventsQuery.isLoading && events.length === 0 && (
          <Card className="surface-card">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta-50">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-foreground">No events yet</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Start a new hootenanny — you'll see it here as a draft until you publish it.
              </p>
              <Link href="/create">
                <Button className="mt-6 rounded-full bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create your first event
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {events.length > 0 && (
          <div className="space-y-3">
            {events.map((ev) => {
              const isDraft = ev.status === "draft";
              const isPolling = ev.pollStatus === "polling";
              const unreadCount = commentCounts[ev.id] ?? 0;
              const dateLabel = (() => {
                if (isPolling) return `Polling · ${ev.candidateDates?.length ?? 0} candidate dates`;
                if (!ev.date) return "No date";
                const d = parseLocalDate(ev.date);
                if (Number.isNaN(d.getTime())) return ev.date;
                return format(d, "EEE, MMM d, yyyy");
              })();
              return (
                <div
                  key={ev.id}
                  className="surface-card flex flex-wrap items-center gap-4 p-5"
                  data-testid={`my-event-${ev.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-serif text-xl font-semibold text-foreground">{ev.title}</h3>
                      {isDraft ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-medium text-sand-600 ring-1 ring-sand-200">
                          <Hourglass className="h-3 w-3" />
                          Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-medium text-sage-700 ring-1 ring-sage-100">
                          Published
                        </span>
                      )}
                      {unreadCount > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-primary/20"
                          data-testid={`unread-badge-${ev.id}`}
                        >
                          <MessageSquare className="h-3 w-3" />
                          {unreadCount} new {unreadCount === 1 ? "message" : "messages"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {dateLabel}
                      </span>
                      {ev.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="max-w-[24ch] truncate">{ev.location}</span>
                        </span>
                      )}
                      {ev.expectedGuests && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {ev.expectedGuests} expected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (!window.confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
                        deleteMutation.mutate(ev.id);
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${ev.id}`}
                      aria-label="Delete event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white"
                      onClick={() => setLocation(`/event/${ev.id}`)}
                      data-testid={`button-open-${ev.id}`}
                    >
                      Open
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
