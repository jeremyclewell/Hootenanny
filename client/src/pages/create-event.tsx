import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { isUnauthorizedError } from "@/lib/auth-utils";
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
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Users, Clock, PartyPopper, CalendarRange, Hourglass, Utensils, ArrowRight } from "lucide-react";
import { DURATION_OPTIONS } from "@/lib/duration";
import { format } from "date-fns";
import { Link } from "wouter";
import AddressAutocomplete from "@/components/address-autocomplete";
import { cn } from "@/lib/utils";
import { parseLocalDate, pollWindowEnd, startOfToday } from "@/lib/calendar";

type DateMode = "fixed" | "poll";
type TimeType = "duration" | "range";

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dateMode, setDateMode] = useState<DateMode>("fixed");
  const [candidateDates, setCandidateDates] = useState<Date[]>([]);
  const [timeType, setTimeType] = useState<TimeType>("duration");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [endDateOpen, setEndDateOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: null,
      theme: "",
      date: null,
      time: "",
      location: "",
      expectedGuests: null,
      durationMinutes: 120,
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      const response = await apiRequest("POST", "/api/events", data);
      return response.json();
    },
    onSuccess: (event) => {
      toast({
        title: "Draft saved!",
        description: "Review your event, then hit Publish to share it with guests.",
      });
      setLocation(`/event/${event.id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Please sign in", description: "Logging you in…", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create event. Please try again.", variant: "destructive" });
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
        time: null,
        pollStatus: "polling",
        candidateDates: sorted.map((d) => format(d, "yyyy-MM-dd")),
      });
    } else {
      const payload: InsertEvent = { ...data, pollStatus: "none", candidateDates: null };
      if (timeType === "range") {
        payload.endDate = endDate || null;
        payload.endTime = endTime || null;
        payload.durationMinutes = 120; // default, not used when endDate is set
      }
      createEventMutation.mutate(payload);
    }
  };

  const today = startOfToday();
  const fourWeeksOut = pollWindowEnd();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-warm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="icon-chip-sm bg-primary">
                <Utensils className="text-white h-4 w-4" />
              </div>
              <span className="text-lg font-serif font-semibold text-foreground">Hootenanny</span>
            </div>
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
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Create a New Event</h1>
          <p className="text-muted-foreground">Set up your hootenanny with a theme and share with guests.</p>
        </div>

        <Card className="surface-card">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Summer Pool Party 2025" {...field} />
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
                      <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Join us for a fun-filled summer gathering!"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date mode selector */}
                <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                  <Label className="text-sm font-semibold text-foreground">When is it?</Label>
                  <RadioGroup
                    value={dateMode}
                    onValueChange={(v) => setDateMode(v as DateMode)}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <label
                      htmlFor="mode-fixed"
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-all ${
                        dateMode === "fixed"
                          ? "border-primary ring-1 ring-primary bg-terracotta-50"
                          : "border-border hover:border-sand-400"
                      }`}
                    >
                      <RadioGroupItem id="mode-fixed" value="fixed" className="mt-1" />
                      <div>
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <CalendarIcon className="h-4 w-4" />
                          Set a date
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">You already know when.</p>
                      </div>
                    </label>
                    <label
                      htmlFor="mode-poll"
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-all ${
                        dateMode === "poll"
                          ? "border-primary ring-1 ring-primary bg-terracotta-50"
                          : "border-border hover:border-sand-400"
                      }`}
                    >
                      <RadioGroupItem id="mode-poll" value="poll" className="mt-1" />
                      <div>
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <CalendarRange className="h-4 w-4" />
                          Let guests pick
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Offer dates and finalize later.</p>
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
                            Date <span className="text-muted-foreground font-normal">(optional)</span>
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "h-11 w-full rounded-xl border border-border/60 bg-muted/50 px-4 text-base font-normal text-left transition-colors",
                                    "hover:bg-card hover:border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                                    !field.value && "text-muted-foreground/70"
                                  )}
                                >
                                  {field.value ? format(parseLocalDate(field.value), "PPP") : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <DateCalendar
                                mode="single"
                                selected={field.value ? parseLocalDate(field.value) : undefined}
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

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Time
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              className="w-full [color-scheme:light]"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expectedGuests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Guests <span className="text-muted-foreground font-normal">(optional)</span>
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

                    {/* Duration vs Range toggle */}
                    <div className="md:col-span-3 space-y-3">
                      <Label className="flex items-center gap-2">
                        <Hourglass className="h-4 w-4" />
                        How long will it last?
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTimeType("duration")}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                            timeType === "duration"
                              ? "border-primary bg-terracotta-50 text-primary font-medium ring-1 ring-primary"
                              : "border-border bg-card text-muted-foreground hover:border-sand-400"
                          }`}
                        >
                          <Hourglass className="h-4 w-4 shrink-0" />
                          Duration
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimeType("range")}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                            timeType === "range"
                              ? "border-primary bg-terracotta-50 text-primary font-medium ring-1 ring-primary"
                              : "border-border bg-card text-muted-foreground hover:border-sand-400"
                          }`}
                        >
                          <ArrowRight className="h-4 w-4 shrink-0" />
                          End date &amp; time
                        </button>
                      </div>

                      {timeType === "duration" ? (
                        <FormField
                          control={form.control}
                          name="durationMinutes"
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                onValueChange={(v) => field.onChange(parseInt(v))}
                                value={String(field.value ?? 120)}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-duration">
                                    <SelectValue placeholder="Pick a duration" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DURATION_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          <div className="space-y-1.5">
                            <Label className="flex items-center gap-2 text-sm">
                              <CalendarIcon className="h-4 w-4" />
                              End date
                            </Label>
                            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "h-11 w-44 rounded-xl border border-border/60 bg-muted/50 px-4 text-sm font-normal text-left transition-colors justify-start",
                                    !endDate && "text-muted-foreground/70"
                                  )}
                                >
                                  {endDate
                                    ? format(parseLocalDate(endDate), "MMM d, yyyy")
                                    : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <DateCalendar
                                  mode="single"
                                  selected={endDate ? parseLocalDate(endDate) : undefined}
                                  onSelect={(d) => {
                                    setEndDate(d ? format(d, "yyyy-MM-dd") : "");
                                    setEndDateOpen(false);
                                  }}
                                  disabled={(d) => d < today}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4" />
                              End time <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              className="w-40 [color-scheme:light]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <CalendarRange className="h-4 w-4" />
                          Candidate Dates
                        </Label>
                        <span className="text-xs text-muted-foreground">{candidateDates.length} selected</span>
                      </div>
                      <p className="mb-3 text-xs text-muted-foreground">
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
                                className="rounded-full bg-terracotta-100 px-2.5 py-0.5 text-xs text-primary font-medium"
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
                            Expected Guests <span className="text-muted-foreground font-normal">(optional)</span>
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
                        Location
                      </FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value || ""}
                          onChange={(v) => field.onChange(v)}
                          placeholder="123 Summer Lane, Poolside"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 rounded-full h-12 text-base font-medium"
                  disabled={createEventMutation.isPending}
                >
                  <PartyPopper className="mr-2 h-5 w-5" />
                  {createEventMutation.isPending ? "Saving draft…" : "Save as draft"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
