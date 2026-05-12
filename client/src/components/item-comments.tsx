import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Trash2, ChevronDown, LogIn } from "lucide-react";
import type { ItemComment } from "@shared/schema";
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

interface ItemCommentsProps {
  itemId: number;
  eventId: string;
  comments: ItemComment[];
  isHost: boolean;
  isPolling: boolean;
  rsvps: GuestRsvp[];
  lastViewedAt?: Date | null;
}

function isNew(createdAt: string | Date, lastViewedAt: Date | null | undefined): boolean {
  if (lastViewedAt === undefined) return false;
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (lastViewedAt === null) return true;
  return created > lastViewedAt;
}

export default function ItemComments({ itemId, eventId, comments, isHost, isPolling, rsvps, lastViewedAt }: ItemCommentsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Always read the guest name fresh from localStorage — no stale state.
  // When rsvps prop updates after a same-tab RSVP, the component re-renders
  // and picks up the new name immediately, flipping hasRsvp to true.
  const authName = user
    ? ([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "")
    : "";

  // Counter used only to force re-renders on cross-tab storage changes
  const [, setNameTick] = useState(0);
  useEffect(() => {
    if (user) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "hootenanny-guest-name") setNameTick((n) => n + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user]);

  const effectiveName = user ? authName : getGuestName();

  // Has this person RSVPd? (hosts bypass; polling events have no RSVPs yet)
  const hasRsvp = isHost || isPolling || rsvps.some(
    (r) => r.guestName.trim().toLowerCase() === effectiveName.trim().toLowerCase()
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/item-comments`] });

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/items/${itemId}/comments`, {
        authorName: effectiveName.trim(),
        content: content.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      invalidate();
    },
    onError: () => toast({ title: "Could not post note", variant: "destructive" }),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/item-comments/${commentId}`, { authorName: effectiveName });
    },
    onSuccess: invalidate,
    onError: () => toast({ title: "Could not delete note", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addComment.mutate();
  };

  const count = comments.length;
  const newCount = lastViewedAt !== undefined
    ? comments.filter((c) => isNew(c.createdAt, lastViewedAt)).length
    : 0;

  return (
    <div className="mt-1.5">
      {/* Toggle button */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        data-testid={`toggle-item-comments-${itemId}`}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {count === 0 ? "Add a note" : `${count} ${count === 1 ? "note" : "notes"}`}
        {newCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground leading-none">
            {newCount} new
          </span>
        )}
        {count > 0 && (
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div
          className="mt-2 rounded-xl border border-border bg-background/80 p-3 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Existing comments — always visible */}
          {comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((c) => {
                const commentIsNew = isNew(c.createdAt, lastViewedAt);
                return (
                <div
                  key={c.id}
                  className={`flex items-start gap-2 group rounded-lg px-2 py-1.5 -mx-2 ${
                    commentIsNew ? "bg-terracotta-50/70" : ""
                  }`}
                  data-testid={`item-comment-${c.id}`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terracotta-50 text-[10px] font-semibold text-primary">
                    {c.authorName[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
                      {commentIsNew && (
                        <span className="inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground leading-none">
                          New
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed mt-0.5">{c.content}</p>
                  </div>
                  {(isHost || c.authorName.trim().toLowerCase() === effectiveName.trim().toLowerCase()) && (
                    <button
                      onClick={() => deleteComment.mutate(c.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-destructive transition-all"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          )}

          {/* RSVP gate */}
          {!hasRsvp ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5">
              <LogIn className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground flex-1">
                RSVP to this event to leave notes.
              </p>
              <RsvpDialog
                eventId={eventId}
                trigger={
                  <Button size="sm" variant="outline" className="rounded-full h-7 px-3 text-xs shrink-0">
                    RSVP
                  </Button>
                }
              />
            </div>
          ) : (
            /* Compose */
            <form onSubmit={handleSubmit} className="space-y-2">
              {effectiveName && (
                <p className="text-[11px] text-muted-foreground">
                  Commenting as <span className="font-semibold text-foreground">{effectiveName}</span>
                </p>
              )}
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Leave a note…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); }
                  }}
                  className="min-h-[60px] text-xs rounded-lg resize-none flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="self-end rounded-full h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                  disabled={addComment.isPending || !content.trim()}
                  aria-label="Post note"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
