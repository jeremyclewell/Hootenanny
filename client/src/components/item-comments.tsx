import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Trash2, ChevronDown } from "lucide-react";
import type { ItemComment } from "@shared/schema";

const STORAGE_KEY = "hootenanny-commenter-name";

function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

interface ItemCommentsProps {
  itemId: number;
  eventId: string;
  comments: ItemComment[];
  isHost: boolean;
}

export default function ItemComments({ itemId, eventId, comments, isHost }: ItemCommentsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState(() => {
    if (user) return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "";
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) {
      setAuthorName([user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "");
    }
  }, [user]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/item-comments`] });

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/items/${itemId}/comments`, {
        authorName: authorName.trim(),
        content: content.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      try { localStorage.setItem(STORAGE_KEY, authorName.trim()); } catch {}
      setContent("");
      invalidate();
    },
    onError: () => toast({ title: "Could not post comment", variant: "destructive" }),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/item-comments/${commentId}`, { authorName });
    },
    onSuccess: invalidate,
    onError: () => toast({ title: "Could not delete comment", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim()) {
      toast({ title: "Please enter your name first", variant: "destructive" });
      return;
    }
    if (!content.trim()) return;
    addComment.mutate();
  };

  const count = comments.length;

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
        {count > 0 && (
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div
          className="mt-2 rounded-xl border border-border bg-background/80 p-3 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Existing comments */}
          {comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 group" data-testid={`item-comment-${c.id}`}>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terracotta-50 text-[10px] font-semibold text-primary">
                    {c.authorName[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed mt-0.5">{c.content}</p>
                  </div>
                  {(isHost || c.authorName.trim().toLowerCase() === authorName.trim().toLowerCase()) && (
                    <button
                      onClick={() => deleteComment.mutate(c.id)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-destructive transition-all"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Compose */}
          <form onSubmit={handleSubmit} className="space-y-2">
            {!user && (
              <Input
                placeholder="Your name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
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
                aria-label="Post comment"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
