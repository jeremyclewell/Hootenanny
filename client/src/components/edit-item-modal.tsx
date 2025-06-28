import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { editItemSchema, type EditItem, type Item } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type EditItemForm = EditItem;

export default function EditItemModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditItemForm>({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      name: "",
      category: "",
    },
  });

  // Reset form when item changes
  useEffect(() => {
    if (selectedItem) {
      form.reset({
        name: selectedItem.name,
        category: selectedItem.category,
      });
    }
  }, [selectedItem, form]);

  const editItemMutation = useMutation({
    mutationFn: async (data: EditItemForm) => {
      if (!selectedItem) throw new Error("No item selected");
      const response = await apiRequest("PUT", `/api/items/${selectedItem.id}`, {
        ...data,
        eventId: selectedItem.eventId,
      });
      return response.json();
    },
    onMutate: async (data: EditItemForm) => {
      if (!selectedItem) return;
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/events/${selectedItem.eventId}/items`] });
      await queryClient.cancelQueries({ queryKey: [`/api/events/${selectedItem.eventId}/stats`] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData([`/api/events/${selectedItem.eventId}/items`]);
      const previousStats = queryClient.getQueryData([`/api/events/${selectedItem.eventId}/stats`]);

      // Optimistically update the item
      queryClient.setQueryData([`/api/events/${selectedItem.eventId}/items`], (old: any) => 
        old ? old.map((item: any) => 
          item.id === selectedItem.id 
            ? { ...item, name: data.name, category: data.category }
            : item
        ) : []
      );

      return { previousItems, previousStats };
    },
    onError: (error: any, data, context) => {
      if (context && selectedItem) {
        // Roll back on error
        queryClient.setQueryData([`/api/events/${selectedItem.eventId}/items`], context.previousItems);
        queryClient.setQueryData([`/api/events/${selectedItem.eventId}/stats`], context.previousStats);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update item. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (item) => {
      setIsOpen(false);
      toast({
        title: "Item Updated Successfully!",
        description: `"${item.name}" has been updated`,
      });
    },
    onSettled: (item) => {
      if (item) {
        // Always refetch to ensure correct data
        queryClient.invalidateQueries({ queryKey: [`/api/events/${item.eventId}/items`] });
        queryClient.invalidateQueries({ queryKey: [`/api/events/${item.eventId}/stats`] });
      }
    },
  });

  // Listen for modal open events
  useEffect(() => {
    const handleOpenModal = (event: CustomEvent<Item>) => {
      setSelectedItem(event.detail);
      setIsOpen(true);
    };

    window.addEventListener("openEditItemModal", handleOpenModal as EventListener);
    return () => window.removeEventListener("openEditItemModal", handleOpenModal as EventListener);
  }, []);

  const onSubmit = (data: EditItemForm) => {
    editItemMutation.mutate(data);
  };

  const categories = [
    { value: "appetizers", label: "Appetizers" },
    { value: "main-dishes", label: "Main Dishes" }, 
    { value: "sides", label: "Side Dishes" },
    { value: "desserts", label: "Desserts" },
    { value: "beverages", label: "Beverages" },
    { value: "snacks", label: "Snacks" },
    { value: "salads", label: "Salads" },
    { value: "bread", label: "Bread/Rolls" },
    { value: "condiments", label: "Condiments" },
    { value: "other", label: "Other" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the item name and category. Only unclaimed items can be edited.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="e.g., Caesar Salad"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.watch("category") || ""}
              onValueChange={(value) => form.setValue("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-red-600">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={editItemMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {editItemMutation.isPending ? "Updating..." : "Update Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}