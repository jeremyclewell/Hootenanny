import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema, type InsertEvent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { themes } from "@/lib/theme-items";
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Users, Clock, PartyPopper, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

type DateMode = "fixed" | "poll";

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dateMode, setDateMode] = useState<DateMode>("fixed");
  const [candidateDates, setCandidateDates] = useState<Date[]>([]);

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: null,
      theme: "",
      date: null,
      location: null,
      expectedGuests: null,
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      const response = await apiRequest("POST", "/api/events", data);
      return response.json();
    },
    onSuccess: (event) => {
      // Persist the host token so this browser can finalize the date later
      if (event?.hostToken) {
        try {
          localStorage.setItem(`hootenanny-host-${event.id}`, event.hostToken);
        } catch {}
      }
      toast({
        title: "Event Created!",
        description:
          dateMode === "poll"
            ? "Share the link so guests can vote on a date."
            : "Your hootenanny event has been created successfully.",
      });
      setLocation(`/event/${event.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertEvent) => {
    if (dateMode === "poll") {
      if (candidateDates.length < 2) {
        toast({
          title: "Pick a few dates",
          description: "Choose at least 2 candidate dates for guests to vote on.",
          variant: "destructive",
        });
        return;
      }
      const sorted = [...candidateDates].sort((a, b) => a.getTime() - b.getTime());
      createEventMutation.mutate({
        ...data,
        date: null,
        pollStatus: "polling",
        candidateDates: sorted.map((d) => format(d, "yyyy-MM-dd")),
      });
    } else {
      createEventMutation.mutate({
        ...data,
        pollStatus: "none",
        candidateDates: null,
      });
    }
  };

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const fourWeeksOut = new Date(today);
  fourWeeksOut.setDate(fourWeeksOut.getDate() + 28);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Hootenanny Event</CardTitle>
            <CardDescription>
              Set up your hootenanny event with themed items and share with guests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Summer Pool Party 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Theme</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a theme" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {themes.map((theme) => (
                            <SelectItem key={theme.id} value={theme.id}>
                              {theme.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Join us for a fun-filled pool party! Bring your appetite and let's make this a memorable summer gathering."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date mode selector */}
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <Label className="text-sm font-semibold text-gray-900">When is it?</Label>
                  <RadioGroup
                    value={dateMode}
                    onValueChange={(v) => setDateMode(v as DateMode)}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <label
                      htmlFor="mode-fixed"
                      className={`flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3 transition ${
                        dateMode === "fixed" ? "border-primary ring-1 ring-primary" : "border-gray-200"
                      }`}
                    >
                      <RadioGroupItem id="mode-fixed" value="fixed" className="mt-1" />
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <CalendarIcon className="h-4 w-4" />
                          Set a date
                        </div>
                        <p className="mt-1 text-xs text-gray-600">
                          You already know the date.
                        </p>
                      </div>
                    </label>
                    <label
                      htmlFor="mode-poll"
                      className={`flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3 transition ${
                        dateMode === "poll" ? "border-primary ring-1 ring-primary" : "border-gray-200"
                      }`}
                    >
                      <RadioGroupItem id="mode-poll" value="poll" className="mt-1" />
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <CalendarRange className="h-4 w-4" />
                          Let guests pick
                        </div>
                        <p className="mt-1 text-xs text-gray-600">
                          Offer a few dates and finalize later.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {dateMode === "fixed" ? (
                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Event Date (Optional)
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <DateCalendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                                disabled={(date) => date < today}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col">
                      <label className="flex items-center gap-2 text-sm font-medium leading-none mb-2">
                        <Clock className="h-4 w-4" />
                        Event Time (Optional)
                      </label>
                      <Input
                        type="time"
                        placeholder="Select time"
                        className="w-full"
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="expectedGuests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Expected Guests (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="25"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <CalendarRange className="h-4 w-4" />
                          Candidate Dates
                        </Label>
                        <span className="text-xs text-gray-500">
                          {candidateDates.length} selected
                        </span>
                      </div>
                      <p className="mb-3 text-xs text-gray-600">
                        Tap the days that could work. Guests will pick which of these work for them.
                      </p>
                      <div className="flex justify-center">
                        <DateCalendar
                          mode="multiple"
                          selected={candidateDates}
                          onSelect={(days) => setCandidateDates(days || [])}
                          disabled={(date) => date < today}
                          fromDate={today}
                          toDate={fourWeeksOut}
                          numberOfMonths={1}
                        />
                      </div>
                      {candidateDates.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {[...candidateDates]
                            .sort((a, b) => a.getTime() - b.getTime())
                            .map((d) => (
                              <span
                                key={d.toISOString()}
                                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                              >
                                {format(d, "EEE, MMM d")}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="expectedGuests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Expected Guests (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="25"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="123 Summer Lane, Poolside" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={createEventMutation.isPending}
                >
                  <PartyPopper className="mr-2 h-4 w-4" />
                  {createEventMutation.isPending ? "Creating..." : "Create Hootenanny"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
