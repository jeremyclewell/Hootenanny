import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, UtensilsCrossed, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getCategory } from "@/lib/categories";
import type { Item, ItemComment } from "@shared/schema";
import ItemComments from "@/components/item-comments";

interface GuestRsvp { guestName: string; }

interface ItemCategoriesProps {
  items: Item[];
  eventId: string;
  itemComments: ItemComment[];
  isHost: boolean;
  isPolling: boolean;
  rsvps: GuestRsvp[];
  lastViewedAt?: Date | null;
}

/** First-name + last-initial helper for "Anya P. is bringing this" style. */
function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

export default function ItemCategories({ items, eventId, itemComments, isHost, isPolling, rsvps, lastViewedAt }: ItemCategoriesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/items`] });
    queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/stats`] });
  };

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
        body: JSON.stringify({ eventId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to delete item");
      return response.json();
    },
    onMutate: async (itemId: number) => {
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/items`] });
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/stats`] });
      const previousItems = queryClient.getQueryData([`/api/events/${eventId}/items`]);
      const previousStats = queryClient.getQueryData([`/api/events/${eventId}/stats`]);
      queryClient.setQueryData([`/api/events/${eventId}/items`], (old: unknown) =>
        Array.isArray(old) ? old.filter((item: Item) => item.id !== itemId) : []
      );
      return { previousItems, previousStats };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData([`/api/events/${eventId}/items`], context?.previousItems);
      queryClient.setQueryData([`/api/events/${eventId}/stats`], context?.previousStats);
      toast({ title: "Error", description: "Failed to remove item.", variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Item removed" }),
    onSettled: invalidate,
  });

  const unclaimItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/items/${itemId}/unclaim`, {
        method: "POST",
        body: JSON.stringify({ eventId }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to unclaim item");
      return response.json();
    },
    onMutate: async (itemId: number) => {
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/items`] });
      const previousItems = queryClient.getQueryData([`/api/events/${eventId}/items`]);
      const previousStats = queryClient.getQueryData([`/api/events/${eventId}/stats`]);
      queryClient.setQueryData([`/api/events/${eventId}/items`], (old: unknown) =>
        Array.isArray(old)
          ? old.map((item: Item) =>
              item.id === itemId ? { ...item, claimedBy: null, claimedByEmail: null, claimedAt: null } : item
            )
          : []
      );
      return { previousItems, previousStats };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData([`/api/events/${eventId}/items`], context?.previousItems);
      queryClient.setQueryData([`/api/events/${eventId}/stats`], context?.previousStats);
      toast({ title: "Error", description: "Failed to unclaim item.", variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Item unclaimed" }),
    onSettled: invalidate,
  });

  const handleClaimItem = (item: Item) => {
    if (item.claimedBy) return;
    const savedName = localStorage.getItem("potluck-user-name");
    if (savedName) {
      window.dispatchEvent(new CustomEvent("autoClaimItem", {
        detail: { item, name: savedName, email: localStorage.getItem("potluck-user-email") || "" },
      }));
    } else {
      window.dispatchEvent(new CustomEvent("openClaimModal", { detail: item }));
    }
  };

  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  const categoryEntries = Object.entries(itemsByCategory);
  const totalCategories = categoryEntries.length;
  const visibleEntries = expanded ? categoryEntries : categoryEntries.slice(0, 1);
  const hiddenCount = totalCategories - visibleEntries.length;

  const renderSection = (category: string, categoryItems: Item[]) => {
    const cfg = getCategory(category);
    const CategoryIcon = cfg.icon;
    const claimed = categoryItems.filter((i) => i.claimedBy).length;
    const open = categoryItems.length - claimed;

    return (
      <div key={category} className="surface-callout border-terracotta-100 bg-terracotta-50 p-2.5" data-testid={`category-${category}`}>
        {/* Category header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="icon-chip-sm bg-card">
              <CategoryIcon className="h-4 w-4 text-primary" />
            </span>
            <h3 className="font-serif font-semibold text-foreground text-lg">{cfg.name}</h3>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-terracotta-100 px-1.5 text-xs font-semibold text-primary">
              {categoryItems.length}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {claimed} claimed · {open} open
          </span>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {categoryItems.map((item) => {
            const isClaimed = !!item.claimedBy;
            const commentsForItem = itemComments.filter((c) => c.itemId === item.id);
            return (
              <div key={item.id} data-testid={`item-${item.id}`}>
                <div
                  onClick={() => handleClaimItem(item)}
                  className={`flex items-center justify-between rounded-xl p-3 transition-all duration-200 ${
                    isClaimed
                      ? "bg-sage-50 cursor-default"
                      : "bg-card hover:bg-accent/40 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`icon-chip-sm ${isClaimed ? "bg-sage-100" : "bg-terracotta-50"}`}>
                      {isClaimed
                        ? <Check className="h-4 w-4 text-sage-600" />
                        : <UtensilsCrossed className="h-4 w-4 text-primary" />
                      }
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-foreground leading-tight ${isClaimed ? "line-through text-muted-foreground" : ""}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isClaimed
                          ? <><span className="font-medium">{shortName(item.claimedBy!)}</span> is bringing this</>
                          : "Up for grabs"
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!isClaimed && (
                      <Button
                        size="sm"
                        onClick={() => handleClaimItem(item)}
                        className="bg-primary hover:bg-primary/90 rounded-full px-4 h-8 text-xs"
                        data-testid={`button-claim-${item.id}`}
                      >
                        Claim
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full bg-card border border-border text-muted-foreground hover:bg-card"
                          data-testid={`item-menu-${item.id}`}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isClaimed ? (
                          <DropdownMenuItem
                            onClick={() => unclaimItemMutation.mutate(item.id)}
                            disabled={unclaimItemMutation.isPending}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Unclaim
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={() => window.dispatchEvent(new CustomEvent("openEditItemModal", { detail: item }))}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              disabled={deleteItemMutation.isPending}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Per-item comment thread */}
                <div className="px-3 pb-1">
                  <ItemComments
                    itemId={item.id}
                    eventId={eventId}
                    comments={commentsForItem}
                    isHost={isHost}
                    isPolling={isPolling}
                    rsvps={rsvps}
                    lastViewedAt={lastViewedAt}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (categoryEntries.length === 0) return null;

  return (
    <div className="space-y-4">
      {visibleEntries.map(([cat, catItems]) => renderSection(cat, catItems))}

      {/* Show all / collapse toggle */}
      {totalCategories > 1 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full bg-card"
            data-testid="button-toggle-categories"
          >
            {expanded
              ? `Show fewer categories`
              : <>View all <span className="font-semibold mx-1">{totalCategories}</span> categories</>
            }
          </Button>
        </div>
      )}
    </div>
  );
}
