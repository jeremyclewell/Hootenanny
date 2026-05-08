import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemSchema, type InsertItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/categories";
import { Plus, PlusCircle } from "lucide-react";
import { z } from "zod";

const customItemSchema = insertItemSchema
  .omit({ eventId: true, isCustom: true, claimedBy: true, claimedByEmail: true })
  .extend({
    name: z.string().min(1, "Item name is required"),
    category: z.string().min(1, "Category is required"),
  });

type CustomItemForm = z.infer<typeof customItemSchema>;

interface AddCustomItemProps {
  eventId: string;
}

export default function AddCustomItem({ eventId }: AddCustomItemProps) {
  const { toast } = useToast();

  const form = useForm<CustomItemForm>({
    resolver: zodResolver(customItemSchema),
    defaultValues: { name: "", category: "" },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: CustomItemForm) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/items`, data);
      return response.json();
    },
    onMutate: async (data: CustomItemForm) => {
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/items`] });
      await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/stats`] });
      const previousItems = queryClient.getQueryData([`/api/events/${eventId}/items`]);
      const previousStats = queryClient.getQueryData([`/api/events/${eventId}/stats`]);
      const optimisticItem = {
        id: Date.now(),
        name: data.name,
        category: data.category,
        eventId,
        isCustom: true,
        claimedBy: null,
        claimedByEmail: null,
        claimedAt: null,
      };
      queryClient.setQueryData([`/api/events/${eventId}/items`], (old: unknown) =>
        Array.isArray(old) ? [...old, optimisticItem] : [optimisticItem]
      );
      return { previousItems, previousStats };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData([`/api/events/${eventId}/items`], context?.previousItems);
      queryClient.setQueryData([`/api/events/${eventId}/stats`], context?.previousStats);
      toast({ title: "Error", description: "Failed to add item. Please try again.", variant: "destructive" });
    },
    onSuccess: () => {
      form.reset();
      toast({ title: "Item added!", description: "Your item is now on the list." });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/stats`] });
    },
  });

  return (
    <div className="surface-card p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="icon-chip-sm bg-terracotta-50">
          <PlusCircle className="h-4 w-4 text-primary" />
        </span>
        <h3 className="text-lg font-serif font-semibold text-foreground">Add a custom item</h3>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) => addItemMutation.mutate(d))}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="flex-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="e.g. Homemade Cookies, Fresh Fruit Salad…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="sm:w-48">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
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
          </div>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 rounded-full "
            disabled={addItemMutation.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            {addItemMutation.isPending ? "Adding…" : "Add Item"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
