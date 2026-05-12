import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Trash2, Crown, LogIn } from "lucide-react";
import type { EventComment, Event } from "@shared/schema";
import { getGuestName } from "@/lib/guest-storage";
import RsvpDialog from "@/components/rsvp-dialog";

function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface GuestRsvp { guestName: string; }

interface EventDiscussionProps {
  event: Event;
  isHost: boolean;
  rsvps: GuestRsvp[];
}

export default function EventDiscussion({ event, isHost, rsvps }: EventDiscussionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [content, setContent] = useState("");

  const isPolling = event.pollStatus === "polling";

  // Derive name from auth or stored RSVP name — no manual input
  const authName = user ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "") : "";
  const [guestName, setGuestDisplayName] = useState(() => user ? authName : getGuestName());

  useEffect(() => {
    if (user) { setGuestDisplayName(authName); return; }
    // Sync with other tabs / components that update guest-storage
    const onStorage = (e: StorageEvent) => {
      if (e.key === "hootenanny-guest-name" && e.newValue) setGuestDisplayName(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user, authName]);

  const effectiveName = user ? authName : guestName;

  // Has this person RSVPd? (hosts bypass; polling events have no RSVPs yet)
  const hasRsvp = isHost || isPolling || rsvps.some(
    (r) => r.guestName.trim().toLowerCase() === effectiveName.trim().toLowerCase()
  );

  const commentsQuery = useQuery<EventComment[]>({
    queryKey: [`/api/events/${event.id}/comments`],
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/comments`] });

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${event.id}/comments`, {
        authorName: effectiveName.trim(),
        content: content.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      invalidate();
    },
    onError: () => toast({ title: "Could not post comment", variant: "destructive" }),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/event-comments/${commentId}`, { authorName: effectiveName });
    },
    onSuccess: invalidate,
    onError: () => toast({ title: "Could not delete comment", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addComment.mutate();
  };

  const comments = commentsQuery.data || [];

  return (
    <div className="surface-card mt-8 p-6" data-testid="event-discussion">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="icon-chip-md bg-terracotta-50">
          <MessageSquare className="h-5 w-5 text-primary" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">Discussion</p>
          <p className="text-sm text-muted-foreground">
            Questions for the host, notes, or anything else on your mind.
          </p>
        </div>
      </div>

      {/* Comments feed */}
      {commentsQuery.isLoading && (
        <div className="space-y-3 mb-6">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      )}

      {!commentsQuery.isLoading && comments.length === 0 && (
        <p className="mb-6 text-sm text-muted-foreground italic">
          No messages yet — be the first to say something!
        </p>
      )}

      {comments.length > 0 && (
        <div className="mb-6 space-y-3">
          {comments.map((c) => {
            const isOwnComment = c.authorName.trim().toLowerCase() === effectiveName.trim().toLowerCase();
            const canDelete = isHost || isOwnComment;
            const isHostComment = isHost && c.authorName.trim().toLowerCase() === effectiveName.trim().toLowerCase();
            return (
              <div
                key={c.id}
                className="flex items-start gap-3 group rounded-2xl border border-border bg-card p-4"
                data-testid={`event-comment-${c.id}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-50 text-sm font-semibold text-primary">
                  {c.authorName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{c.authorName}</span>
                    {isHostComment && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-medium text-sand-600">
                        <Crown className="h-2.5 w-2.5" /> Host
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => deleteComment.mutate(c.id)}
                    className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-all"
                    aria-label="Delete comment"
                    data-testid={`delete-comment-${c.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* RSVP gate or compose box */}
      {!hasRsvp ? (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 p-5">
          <span className="icon-chip-md bg-terracotta-50 shrink-0">
            <LogIn className="h-5 w-5 text-primary" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">RSVP to join the discussion</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Let the host know you're coming, then you can ask questions and leave notes.
            </p>
          </div>
          <RsvpDialog
            eventId={event.id}
            trigger={
              <Button
                size="sm"
                className="rounded-full shrink-0 bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white"
                data-testid="button-rsvp-to-comment"
              >
                RSVP now
              </Button>
            }
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {effectiveName && (
            <p className="text-xs text-muted-foreground">
              Commenting as <span className="font-semibold text-foreground">{effectiveName}</span>
            </p>
          )}
          <div className="flex gap-3 items-end">
            <Textarea
              placeholder="Ask a question or leave a note for the host…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); }
              }}
              className="min-h-[80px] rounded-xl flex-1 resize-none"
              data-testid="discussion-content"
            />
            <Button
              type="submit"
              className="rounded-full h-11 w-11 p-0 bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white shrink-0"
              disabled={addComment.isPending || !content.trim()}
              aria-label="Post"
              data-testid="button-post-comment"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
