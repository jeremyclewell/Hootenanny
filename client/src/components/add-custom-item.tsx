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
import { Plus, PlusCircle } from "lucide-react";
import { z } from "zod";

const customItemSchema = insertItemSchema.omit({ eventId: true, isCustom: true, claimedBy: true, claimedByEmail: true }).extend({
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
    defaultValues: {
      name: "",
      category: "",
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: CustomItemForm) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/items`, data);
      return response.json();
    },
    onSuccess: () => {
      form.reset();
      toast({
        title: "Item Added!",
        description: "Your custom item has been added to the list.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/stats`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomItemForm) => {
    addItemMutation.mutate(data);
  };

  return (
    <div className="bg-white rounded-xl shadow-material p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Add Custom Item</h3>
        <PlusCircle className="text-primary text-lg" />
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Enter custom item (e.g., Homemade Cookies, Fresh Fruit Salad)"
                      {...field}
                    />
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
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="main-dishes">Main Dishes</SelectItem>
                      <SelectItem value="sides">Side Dishes</SelectItem>
                      <SelectItem value="desserts">Desserts</SelectItem>
                      <SelectItem value="beverages">Beverages</SelectItem>
                      <SelectItem value="appetizers">Appetizers</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Button 
            type="submit" 
            className="bg-primary hover:bg-primary/90"
            disabled={addItemMutation.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            {addItemMutation.isPending ? "Adding..." : "Add Item"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
