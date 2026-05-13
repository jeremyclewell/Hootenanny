import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { themes } from "@/lib/theme-items";
import { DURATION_OPTIONS } from "@/lib/duration";
import AddressAutocomplete from "@/components/address-autocomplete";
import { parseLocalDate } from "@/lib/calendar";
import type { Event } from "@shared/schema";

const editSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  theme: z.string().min(1, "Theme is required"),
  location: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  durationMinutes: z.number().int().min(15).max(24 * 60).optional(),
  expectedGuests: z.number().int().min(1).nullable().optional(),
});

type EditForm = z.infer<typeof editSchema>;

type TimeType = "duration" | "endtime";

interface EditEventDialogProps {
  event: Event;
  trigger: React.ReactNode;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function EditEventDialog({ event, trigger }: EditEventDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeType, setTimeType] = useState<TimeType>(
    event.endTime ? "endtime" : "duration"
  );
  const [endTime, setEndTime] = useState(event.endTime || "");

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: event.title,
      description: event.description ?? "",
      theme: event.theme,
      location: event.location ?? "",
      date: event.date ?? null,
      time: event.time ?? "",
      durationMinutes: event.durationMinutes ?? 120,
      expectedGuests: event.expectedGuests ?? null,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EditForm) => {
      const payload: Record<string, unknown> = { ...data };
      if (timeType === "endtime") {
        payload.endTime = endTime || null;
        payload.durationMinutes = undefined;
      } else {
        payload.endTime = null;
      }
      const res = await apiRequest("PATCH", `/api/events/${event.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/my/events"] });
      toast({ title: "Event updated!", description: "Your changes have been saved." });
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    },
  });

  const watchedDate = form.watch("date");

  const selectedDate = (() => {
    if (!watchedDate) return undefined;
    const d = parseLocalDate(watchedDate);
    return Number.isNaN(d.getTime()) ? undefined : d;
  })();

  const isPolling = event.pollStatus === "polling";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Edit event details</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
            className="space-y-5 pt-1"
          >
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event title</FormLabel>
                  <FormControl>
                    <Input placeholder="My Amazing Hootenanny" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell guests what to expect…"
                      className="resize-none min-h-[80px]"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Theme */}
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a theme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {themes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="123 Main St, Springfield…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date — hidden during polling (poll manages date) */}
            {!isPolling && (
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value && selectedDate
                              ? format(selectedDate, "PPP")
                              : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DateCalendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(d) => {
                            field.onChange(d ? format(d, "yyyy-MM-dd") : null);
                            setDateOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Time + duration/end-time */}
            {!isPolling && (
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start time <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("time") && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTimeType("duration")}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                          timeType === "duration"
                            ? "border-primary bg-terracotta-50 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        Duration
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimeType("endtime")}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                          timeType === "endtime"
                            ? "border-primary bg-terracotta-50 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        End time
                      </button>
                    </div>

                    {timeType === "duration" ? (
                      <FormField
                        control={form.control}
                        name="durationMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              value={String(field.value ?? 120)}
                              onValueChange={(v) => field.onChange(Number(v))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {DURATION_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={String(opt.value)}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-sm">End time</Label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Expected guests */}
            <FormField
              control={form.control}
              name="expectedGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected guests <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 20"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-coral-gradient hover:opacity-90 shadow-coral border-0 text-white"
                disabled={mutation.isPending}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {mutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
