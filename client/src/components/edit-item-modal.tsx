import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { editItemSchema, type EditItem, type Item } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { CATEGORIES } from "@/lib/categories";

export default function EditItemModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditItem>({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      name: "",
      category: "",
    },
  });

  useEffect(() => {
    if (selectedItem) {
      form.reset({
        name: selectedItem.name,
        category: selectedItem.category,
      });
    }
  }, [selectedItem, form]);

  const editItemMutation = useMutation({
    mutationFn: async (data: EditItem) => {
      if (!selectedItem) throw new Error("No item selected");
      const response = await apiRequest("PUT", `/api/items/${selectedItem.id}`, {
        ...data,
        eventId: selectedItem.eventId,
      });
      return response.json();
    },
    onMutate: async (data: EditItem) => {
      if (!selectedItem) return;
      await queryClient.cancelQueries({ queryKey: [`/api/events/${selectedItem.eventId}/items`] });
      await queryClient.cancelQueries({ queryKey: [`/api/events/${selectedItem.eventId}/stats`] });
      const previousItems = queryClient.getQueryData([`/api/events/${selectedItem.eventId}/items`]);
      const previousStats = queryClient.getQueryData([`/api/events/${selectedItem.eventId}/stats`]);
      queryClient.setQueryData([`/api/events/${selectedItem.eventId}/items`], (old: unknown) =>
        Array.isArray(old)
          ? old.map((item: Item) =>
              item.id === selectedItem.id ? { ...item, name: data.name, category: data.category } : item,
            )
          : [],
      );
      return { previousItems, previousStats };
    },
    onError: (error: unknown, _data, context) => {
      if (context && selectedItem) {
        queryClient.setQueryData([`/api/events/${selectedItem.eventId}/items`], context.previousItems);
        queryClient.setQueryData([`/api/events/${selectedItem.eventId}/stats`], context.previousStats);
      }
      const message = error instanceof Error ? error.message : "Failed to update item. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
    onSuccess: (item) => {
      setIsOpen(false);
      toast({ title: "Item Updated", description: `"${item.name}" has been updated.` });
    },
    onSettled: (item) => {
      if (item) {
        queryClient.invalidateQueries({ queryKey: [`/api/events/${item.eventId}/items`] });
        queryClient.invalidateQueries({ queryKey: [`/api/events/${item.eventId}/stats`] });
      }
    },
  });

  useEffect(() => {
    const handleOpenModal = (event: CustomEvent<Item>) => {
      setSelectedItem(event.detail);
      setIsOpen(true);
    };
    window.addEventListener("openEditItemModal", handleOpenModal as EventListener);
    return () => window.removeEventListener("openEditItemModal", handleOpenModal as EventListener);
  }, []);

  const onSubmit = (data: EditItem) => editItemMutation.mutate(data);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the item name and category. Only unclaimed items can be edited.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Caesar Salad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editItemMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {editItemMutation.isPending ? "Updating…" : "Update Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
