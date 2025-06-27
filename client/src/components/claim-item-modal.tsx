import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { claimItemSchema, type ClaimItem, type Item } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UtensilsCrossed } from "lucide-react";

export default function ClaimItemModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const { toast } = useToast();

  const form = useForm<ClaimItem>({
    resolver: zodResolver(claimItemSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  // Load saved user data from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('potluck-user-name');
    const savedEmail = localStorage.getItem('potluck-user-email');
    
    if (savedName || savedEmail) {
      form.reset({
        name: savedName || "",
        email: savedEmail || "",
      });
    }
  }, [form]);

  const claimItemMutation = useMutation({
    mutationFn: async (data: ClaimItem) => {
      if (!selectedItem) throw new Error("No item selected");
      const response = await apiRequest("POST", `/api/items/${selectedItem.id}/claim`, data);
      return response.json();
    },
    onSuccess: (item) => {
      setIsOpen(false);
      toast({
        title: "Item Claimed Successfully!",
        description: `You've claimed "${item.name}"`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${item.eventId}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${item.eventId}/stats`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim item. It may have already been claimed.",
        variant: "destructive",
      });
    },
  });

  // Listen for modal open events and auto-claim events
  useEffect(() => {
    const handleOpenModal = (event: CustomEvent<Item>) => {
      setSelectedItem(event.detail);
      setIsOpen(true);
      
      // Load saved data when opening modal
      const savedName = localStorage.getItem('potluck-user-name');
      const savedEmail = localStorage.getItem('potluck-user-email');
      
      form.reset({
        name: savedName || "",
        email: savedEmail || "",
      });
    };

    const handleAutoClaimItem = (event: CustomEvent<{ item: Item; name: string; email: string }>) => {
      const { item, name, email } = event.detail;
      setSelectedItem(item);
      
      // Directly submit the claim without showing modal
      claimItemMutation.mutate({ name, email });
    };

    window.addEventListener('openClaimModal' as any, handleOpenModal);
    window.addEventListener('autoClaimItem' as any, handleAutoClaimItem);
    
    return () => {
      window.removeEventListener('openClaimModal' as any, handleOpenModal);
      window.removeEventListener('autoClaimItem' as any, handleAutoClaimItem);
    };
  }, [form, claimItemMutation]);

  const onSubmit = (data: ClaimItem) => {
    // Save user data to localStorage for future use
    localStorage.setItem('potluck-user-name', data.name);
    if (data.email) {
      localStorage.setItem('potluck-user-email', data.email);
    }
    
    claimItemMutation.mutate(data);
  };

  const handleClose = () => {
    setIsOpen(false);
    form.reset();
  };

  const categoryNames = {
    'main-dishes': 'Main Dishes',
    'sides': 'Side Dishes',
    'appetizers': 'Appetizers',
    'desserts': 'Desserts',
    'beverages': 'Beverages',
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Item</DialogTitle>
        </DialogHeader>
        
        {selectedItem && (
          <>
            <div className="mb-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{selectedItem.name}</h4>
                  <p className="text-sm text-gray-600">
                    {categoryNames[selectedItem.category as keyof typeof categoryNames] || selectedItem.category}
                  </p>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="your.email@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        For event updates and reminders
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleClose}
                    disabled={claimItemMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={claimItemMutation.isPending}
                  >
                    {claimItemMutation.isPending ? "Claiming..." : "Claim Item"}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
