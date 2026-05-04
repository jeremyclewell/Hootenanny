import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, UtensilsCrossed, Drumstick, Leaf, Cake, GlassWater, Apple, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Item } from "@shared/schema";

interface ItemCategoriesProps {
  items: Item[];
  eventId: string;
}

const categoryConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; name: string; iconBg: string; iconColor: string }> = {
  "main-dishes": { icon: Drumstick, name: "Main Dishes",    iconBg: "bg-terracotta-100", iconColor: "text-primary" },
  "sides":       { icon: Leaf,      name: "Side Dishes",    iconBg: "bg-sage-100",       iconColor: "text-sage-600" },
  "appetizers":  { icon: Apple,     name: "Appetizers",     iconBg: "bg-sand-100",       iconColor: "text-sand-600" },
  "desserts":    { icon: Cake,      name: "Desserts",       iconBg: "bg-terracotta-100", iconColor: "text-primary" },
  "beverages":   { icon: GlassWater,name: "Beverages",      iconBg: "bg-teal-100",       iconColor: "text-teal-500" },
};

export default function ItemCategories({ items, eventId }: ItemCategoriesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const renderSection = (category: string, categoryItems: Item[]) => {
    const cfg = categoryConfig[category] ?? { icon: UtensilsCrossed, name: category, iconBg: "bg-sand-100", iconColor: "text-sand-600" };
    const Icon = cfg.icon;
    const claimed = categoryItems.filter((i) => i.claimedBy).length;

    return (
      <div key={category} className="bg-card rounded-2xl border border-border shadow-warm overflow-hidden">
        {/* Category header */}
        <div className="bg-sand-100 border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${cfg.iconBg} rounded-lg flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
              </div>
              <h3 className="font-serif font-semibold text-foreground">{cfg.name}</h3>
              <Badge variant="secondary" className="text-xs bg-sand-200 text-sand-600 border-0">
                {categoryItems.length}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {claimed} claimed · {categoryItems.length - claimed} open
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="p-4 grid gap-3">
          {categoryItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleClaimItem(item)}
              className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                item.claimedBy
                  ? "border-sage-100 bg-sage-50 cursor-default"
                  : "border-border bg-card hover:border-primary hover:shadow-warm cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.claimedBy ? "bg-sage-100" : "bg-sand-100"
                }`}>
                  {item.claimedBy
                    ? <Check className="h-5 w-5 text-sage-600" />
                    : <UtensilsCrossed className="h-5 w-5 text-sand-600" />
                  }
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.claimedBy
                      ? <span>Claimed by <span className="font-medium text-primary">{item.claimedBy}</span></span>
                      : "Tap to claim"
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {item.claimedBy ? (
                  <>
                    <Badge className="bg-sage-400 hover:bg-sage-400 text-white border-0">Claimed</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => unclaimItemMutation.mutate(item.id)}
                          disabled={unclaimItemMutation.isPending}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Unclaim
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Claim
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {Object.entries(itemsByCategory).map(([cat, catItems]) => renderSection(cat, catItems))}
    </div>
  );
}
