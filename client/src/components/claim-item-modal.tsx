import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { claimItemSchema, type ClaimItem, type Item } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCategory } from "@/lib/categories";
import { UtensilsCrossed, Hand } from "lucide-react";

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
    onMutate: async (data: ClaimItem) => {
      if (!selectedItem) return;

      await queryClient.cancelQueries({ queryKey: [`/api/events/${selectedItem.eventId}/items`] });
      await queryClient.cancelQueries({ queryKey: [`/api/events/${selectedItem.eventId}/stats`] });

      const previousItems = queryClient.getQueryData([`/api/events/${selectedItem.eventId}/items`]);
      const previousStats = queryClient.getQueryData([`/api/events/${selectedItem.eventId}/stats`]);

      queryClient.setQueryData([`/api/events/${selectedItem.eventId}/items`], (old: any) =>
        old ? old.map((item: any) =>
          item.id === selectedItem.id
            ? { ...item, claimedBy: data.name, claimedByEmail: data.email, claimedAt: new Date() }
            : item
        ) : []
      );

      return { previousItems, previousStats };
    },
    onError: (error: any, data, context) => {
      if (context && selectedItem) {
        queryClient.setQueryData([`/api/events/${selectedItem.eventId}/items`], context.previousItems);
        queryClient.setQueryData([`/api/events/${selectedItem.eventId}/stats`], context.previousStats);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to claim item. It may have already been claimed.",
        variant: "destructive",
      });
    },
    onSuccess: (item) => {
      setIsOpen(false);
      toast({
        title: "Item claimed!",
        description: `You've claimed "${item.name}"`,
      });
    },
    onSettled: (item) => {
      if (item) {
        queryClient.invalidateQueries({ queryKey: [`/api/events/${item.eventId}/items`] });
        queryClient.invalidateQueries({ queryKey: [`/api/events/${item.eventId}/stats`] });
      }
    },
  });

  const mutationRef = useRef(claimItemMutation);
  const formRef = useRef(form);
  useEffect(() => { mutationRef.current = claimItemMutation; }, [claimItemMutation]);
  useEffect(() => { formRef.current = form; }, [form]);

  useEffect(() => {
    const handleOpenModal = (event: Event) => {
      const detail = (event as CustomEvent<Item>).detail;
      setSelectedItem(detail);
      setIsOpen(true);
      const savedName = localStorage.getItem("potluck-user-name");
      const savedEmail = localStorage.getItem("potluck-user-email");
      formRef.current.reset({ name: savedName || "", email: savedEmail || "" });
    };

    const handleAutoClaimItem = (event: Event) => {
      const { item, name, email } = (event as CustomEvent<{ item: Item; name: string; email: string }>).detail;
      setSelectedItem(item);
      mutationRef.current.mutate({ name, email });
    };

    window.addEventListener("openClaimModal", handleOpenModal);
    window.addEventListener("autoClaimItem", handleAutoClaimItem);

    return () => {
      window.removeEventListener("openClaimModal", handleOpenModal);
      window.removeEventListener("autoClaimItem", handleAutoClaimItem);
    };
  }, []);

  const onSubmit = (data: ClaimItem) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-12">
            <span className="icon-chip-md bg-terracotta-100">
              <Hand className="h-5 w-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-serif text-2xl font-bold text-foreground leading-tight">
                Claim this item
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                Add your name so the host knows what you're bringing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {selectedItem && (
          <>
            <div className="surface-callout border-sand-200 bg-sand-100 flex items-center gap-3 p-3">
              <span className="icon-chip-sm bg-card ">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
              </span>
              <div>
                <h4 className="font-semibold text-foreground leading-tight">{selectedItem.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getCategory(selectedItem.category).name}
                </p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Your name</FormLabel>
                      <FormControl>
                        <Input placeholder="Alex Smith" {...field} />
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
                      <FormLabel className="text-sm font-semibold text-foreground">
                        Email <span className="font-normal text-muted-foreground">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="alex@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>For event updates and reminders.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 rounded-full h-12 text-base font-medium "
                  disabled={claimItemMutation.isPending}
                >
                  {claimItemMutation.isPending ? "Claiming…" : "Claim it"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-muted-foreground"
                  onClick={handleClose}
                  disabled={claimItemMutation.isPending}
                >
                  Cancel
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
