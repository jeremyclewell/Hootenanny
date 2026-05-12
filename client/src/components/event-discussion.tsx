import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Trash2, Crown, LogIn, CornerDownRight, ChevronDown, ChevronUp } from "lucide-react";
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

const COLLAPSE_THRESHOLD = 3;

interface EventDiscussionProps {
  event: Event;
  isHost: boolean;
  rsvps: GuestRsvp[];
}

interface ReplyFormProps {
  onSubmit: (content: string) => void;
  isPending: boolean;
  onCancel: () => void;
}

function ReplyForm({ onSubmit, isPending, onCancel }: ReplyFormProps) {
  const [content, setContent] = useState("");

  const trySubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim());
    setContent("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trySubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2 items-end">
      <Textarea
        placeholder="Reply to this comment…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); trySubmit(); }
          if (e.key === "Escape") onCancel();
        }}
        className="min-h-[64px] rounded-xl flex-1 resize-none text-sm"
        autoFocus
      />
      <div className="flex flex-col gap-1 shrink-0">
        <Button
          type="submit"
          className="rounded-full h-9 w-9 p-0 bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white"
          disabled={isPending || !content.trim()}
          aria-label="Post reply"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="rounded-full h-9 w-9 p-0 text-muted-foreground"
          aria-label="Cancel reply"
        >
          ✕
        </Button>
      </div>
    </form>
  );
}

interface CommentRowProps {
  comment: EventComment;
  isHost: boolean;
  effectiveName: string;
  hostDisplayName: string;
  onDelete: (id: number) => void;
  onReply: (parentId: number) => void;
  replyingTo: number | null;
  replyPending: boolean;
  onReplySubmit: (content: string, parentId: number) => void;
  onReplyCancel: () => void;
  replies?: EventComment[];
}

function CommentRow({
  comment,
  isHost,
  effectiveName,
  hostDisplayName,
  onDelete,
  onReply,
  replyingTo,
  replyPending,
  onReplySubmit,
  onReplyCancel,
  replies = [],
}: CommentRowProps) {
  const isOwnComment = comment.authorName.trim().toLowerCase() === effectiveName.trim().toLowerCase();
  const canDelete = isHost || isOwnComment;
  const isHostComment = isHost && comment.authorName.trim().toLowerCase() === hostDisplayName.trim().toLowerCase();
  const [collapsed, setCollapsed] = useState(false);
  const showToggle = replies.length >= COLLAPSE_THRESHOLD;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      data-testid={`event-comment-${comment.id}`}
    >
      {/* Top-level comment */}
      <div className="flex items-start gap-3 group">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-50 text-sm font-semibold text-primary">
          {comment.authorName[0]?.toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{comment.authorName}</span>
            {isHostComment && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-medium text-sand-600">
                <Crown className="h-2.5 w-2.5" /> Host
              </span>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{comment.content}</p>

          {/* Action row */}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              data-testid={`reply-btn-${comment.id}`}
            >
              <CornerDownRight className="h-3 w-3" />
              Reply
            </button>
            {showToggle && (
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                data-testid={`toggle-replies-${comment.id}`}
              >
                {collapsed ? (
                  <><ChevronDown className="h-3 w-3" /> Show {replies.length} replies</>
                ) : (
                  <><ChevronUp className="h-3 w-3" /> Hide replies</>
                )}
              </button>
            )}
          </div>
        </div>

        {canDelete && (
          <button
            onClick={() => onDelete(comment.id)}
            className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-all"
            aria-label="Delete comment"
            data-testid={`delete-comment-${comment.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Reply compose (inline under the comment it targets) */}
      {replyingTo === comment.id && (
        <div className="pl-11 mt-1">
          <ReplyForm
            onSubmit={(content) => onReplySubmit(content, comment.id)}
            isPending={replyPending}
            onCancel={onReplyCancel}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && !collapsed && (
        <div className="mt-3 pl-11 space-y-3">
          {replies.map((reply) => {
            const replyIsOwn = reply.authorName.trim().toLowerCase() === effectiveName.trim().toLowerCase();
            const replyCanDelete = isHost || replyIsOwn;
            const replyIsHostComment = isHost && reply.authorName.trim().toLowerCase() === hostDisplayName.trim().toLowerCase();
            return (
              <div
                key={reply.id}
                className="flex items-start gap-3 group rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5"
                data-testid={`event-comment-${reply.id}`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terracotta-50 text-xs font-semibold text-primary">
                  {reply.authorName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">{reply.authorName}</span>
                    {replyIsHostComment && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-medium text-sand-600">
                        <Crown className="h-2.5 w-2.5" /> Host
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                </div>
                {replyCanDelete && (
                  <button
                    onClick={() => onDelete(reply.id)}
                    className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-all"
                    aria-label="Delete reply"
                    data-testid={`delete-comment-${reply.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Collapsed count */}
      {replies.length > 0 && collapsed && (
        <div className="mt-2 pl-11">
          <button
            onClick={() => setCollapsed(false)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Show {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function EventDiscussion({ event, isHost, rsvps }: EventDiscussionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

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

  // Host display name for badging replies
  const hostDisplayName = authName;

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
    mutationFn: async (opts: { content: string; parentId?: number | null }) => {
      const res = await apiRequest("POST", `/api/events/${event.id}/comments`, {
        authorName: effectiveName.trim(),
        content: opts.content,
        parentId: opts.parentId ?? null,
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      if (!vars.parentId) setContent("");
      setReplyingTo(null);
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

  const trySubmitTopLevel = () => {
    if (!content.trim()) return;
    addComment.mutate({ content: content.trim(), parentId: null });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trySubmitTopLevel();
  };

  const handleReplySubmit = (replyContent: string, parentId: number) => {
    addComment.mutate({ content: replyContent, parentId });
  };

  const allComments = commentsQuery.data || [];
  const topLevel = allComments.filter((c) => !c.parentId);
  const repliesMap = new Map<number, EventComment[]>();
  for (const c of allComments) {
    if (c.parentId) {
      const arr = repliesMap.get(c.parentId) ?? [];
      arr.push(c);
      repliesMap.set(c.parentId, arr);
    }
  }

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

      {!commentsQuery.isLoading && allComments.length === 0 && (
        <p className="mb-6 text-sm text-muted-foreground italic">
          No messages yet — be the first to say something!
        </p>
      )}

      {topLevel.length > 0 && (
        <div className="mb-6 space-y-3">
          {topLevel.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              isHost={isHost}
              effectiveName={effectiveName}
              hostDisplayName={hostDisplayName}
              onDelete={(id) => deleteComment.mutate(id)}
              onReply={(parentId) => setReplyingTo(replyingTo === parentId ? null : parentId)}
              replyingTo={replyingTo}
              replyPending={addComment.isPending}
              onReplySubmit={handleReplySubmit}
              onReplyCancel={() => setReplyingTo(null)}
              replies={repliesMap.get(c.id) ?? []}
            />
          ))}
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
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); trySubmitTopLevel(); }
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
