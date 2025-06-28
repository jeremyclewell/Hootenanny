import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, UtensilsCrossed, Drumstick, Leaf, Cake, GlassWater, Apple, Trash2 } from "lucide-react";
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
                      {item.isCustom && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Custom
                        </Badge>
                      )}
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
                  <Badge className="bg-green-600 hover:bg-green-600">
                    Claimed
                  </Badge>
                ) : (
                  <Button className="bg-primary hover:bg-primary/90">
                    {localStorage.getItem('potluck-user-name') ? 'Claim Item' : 'Claim Item'}
                  </Button>
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
