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

const categoryIcons = {
  'main-dishes': Drumstick,
  'sides': Leaf,
  'appetizers': Apple,
  'desserts': Cake,
  'beverages': GlassWater,
};

const categoryNames = {
  'main-dishes': 'Main Dishes',
  'sides': 'Side Dishes',
  'appetizers': 'Appetizers',
  'desserts': 'Desserts',
  'beverages': 'Beverages',
};

const categoryColors = {
  'main-dishes': 'bg-red-100 text-red-600',
  'sides': 'bg-green-100 text-green-600',
  'appetizers': 'bg-yellow-100 text-yellow-600',
  'desserts': 'bg-pink-100 text-pink-600',
  'beverages': 'bg-blue-100 text-blue-600',
};

export default function ItemCategories({ items, eventId }: ItemCategoriesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE",
        body: JSON.stringify({ eventId }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to delete item");
      return response.json();
    },
    onMutate: async (itemId: number) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/items`] });
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/stats`] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData([`/api/events/${eventId}/items`]);
      const previousStats = queryClient.getQueryData([`/api/events/${eventId}/stats`]);

      // Optimistically update to the new value
      queryClient.setQueryData([`/api/events/${eventId}/items`], (old: any) => 
        old ? old.filter((item: any) => item.id !== itemId) : []
      );

      // Return a context object with the snapshotted value
      return { previousItems, previousStats };
    },
    onError: (err, itemId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData([`/api/events/${eventId}/items`], context?.previousItems);
      queryClient.setQueryData([`/api/events/${eventId}/stats`], context?.previousStats);
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/stats`] });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item removed successfully!",
      });
    },
  });

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  const handleClaimItem = (item: Item) => {
    if (item.claimedBy) return;
    
    // Check if user name is already saved
    const savedName = localStorage.getItem('potluck-user-name');
    
    if (savedName) {
      // Auto-claim with saved info
      window.dispatchEvent(new CustomEvent('autoClaimItem', { 
        detail: { 
          item, 
          name: savedName, 
          email: localStorage.getItem('potluck-user-email') || '' 
        } 
      }));
    } else {
      // Show modal for first-time users
      window.dispatchEvent(new CustomEvent('openClaimModal', { detail: item }));
    }
  };

  const handleDeleteItem = (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation(); // Prevent triggering claim action
    deleteItemMutation.mutate(itemId);
  };

  const handleEditItem = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation(); // Prevent triggering claim action
    window.dispatchEvent(new CustomEvent('openEditItemModal', { detail: item }));
  };

  // Unclaim item mutation
  const unclaimItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/items/${itemId}/unclaim`, {
        method: "POST",
        body: JSON.stringify({ eventId }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to unclaim item");
      return response.json();
    },
    onMutate: async (itemId: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/items`] });
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/stats`] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData([`/api/events/${eventId}/items`]);
      const previousStats = queryClient.getQueryData([`/api/events/${eventId}/stats`]);

      // Optimistically unclaim the item
      queryClient.setQueryData([`/api/events/${eventId}/items`], (old: any) => 
        old ? old.map((item: any) => 
          item.id === itemId 
            ? { ...item, claimedBy: null, claimedByEmail: null, claimedAt: null }
            : item
        ) : []
      );

      return { previousItems, previousStats };
    },
    onError: (err, itemId, context) => {
      // Roll back on error
      queryClient.setQueryData([`/api/events/${eventId}/items`], context?.previousItems);
      queryClient.setQueryData([`/api/events/${eventId}/stats`], context?.previousStats);
      toast({
        title: "Error",
        description: "Failed to unclaim item. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item unclaimed successfully!",
      });
    },
    onSettled: () => {
      // Always refetch to ensure correct data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/stats`] });
    },
  });

  const handleUnclaimItem = (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation(); // Prevent triggering claim action
    unclaimItemMutation.mutate(itemId);
  };

  const renderCategorySection = (category: string, categoryItems: Item[]) => {
    const Icon = categoryIcons[category as keyof typeof categoryIcons] || UtensilsCrossed;
    const claimed = categoryItems.filter(item => item.claimedBy).length;
    const available = categoryItems.length - claimed;

    return (
      <div key={category} className="bg-white rounded-xl shadow-material overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-600'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {categoryNames[category as keyof typeof categoryNames] || category}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {categoryItems.length} items
              </Badge>
            </div>
            <span className="text-sm text-gray-600">
              {claimed} claimed • {available} available
            </span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid gap-4">
            {categoryItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg transition-all duration-200 ${
                  item.claimedBy
                    ? 'hover:border-gray-300'
                    : 'hover:border-primary hover:shadow-sm cursor-pointer'
                }`}
                onClick={() => handleClaimItem(item)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    item.claimedBy
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }`}>
                    {item.claimedBy ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <UtensilsCrossed className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {item.claimedBy ? (
                        <>Claimed by <span className="font-medium text-primary">{item.claimedBy}</span></>
                      ) : (
                        'Click to claim this item'
                      )}
                    </p>
                  </div>
                </div>
                {item.claimedBy ? (
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-600 hover:bg-green-600">
                      Claimed
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleUnclaimItem(e, item.id)}
                          disabled={unclaimItemMutation.isPending}
                          className="cursor-pointer text-orange-600 focus:text-orange-600"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Unclaim Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button className="bg-primary hover:bg-primary/90">
                      {localStorage.getItem('potluck-user-name') ? 'Claim Item' : 'Claim Item'}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleEditItem(e, item)}
                          className="cursor-pointer"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          disabled={deleteItemMutation.isPending}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {Object.entries(itemsByCategory).map(([category, categoryItems]) =>
        renderCategorySection(category, categoryItems)
      )}
    </div>
  );
}
