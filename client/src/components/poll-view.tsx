import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarCheck, CalendarPlus, CheckCircle2, Clock, Crown, Hourglass, Plus, Trophy, Users } from "lucide-react";
import { DURATION_OPTIONS } from "@/lib/duration";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { pollWindowEnd, startOfToday } from "@/lib/calendar";
import type { Event, DateVote } from "@shared/schema";

interface PollViewProps {
  event: Event;
  isHost: boolean;
  hostToken: string | null;
}

const STORAGE_KEY = "hootenanny-voter";

interface StoredVoter { name: string; email: string; }

function loadStoredVoter(): StoredVoter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: "", email: "" };
}

export default function PollView({ event, isHost, hostToken }: PollViewProps) {
  const { toast } = useToast();
  const candidateDates = event.candidateDates || [];

  const [voter, setVoter] = useState<StoredVoter>(() => loadStoredVoter());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [finalizeTime, setFinalizeTime] = useState<string>("");
  const [finalizeDuration, setFinalizeDuration] = useState<number>(event.durationMinutes ?? 120);
  const [extraDates, setExtraDates] = useState<Date[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const today = startOfToday();
  const fourWeeksOut = pollWindowEnd();

  const votesQuery = useQuery<DateVote[]>({ queryKey: [`/api/events/${event.id}/votes`] });
  const votes = votesQuery.data || [];

  useEffect(() => {
    if (hydrated || votesQuery.isLoading) return;
    const match = votes.find(
      (v) =>
        v.voterName.trim().toLowerCase() === voter.name.trim().toLowerCase() &&
        (v.voterEmail || "").trim().toLowerCase() === voter.email.trim().toLowerCase() &&
        voter.name.trim().length > 0
    );
    if (match) setSelected(new Set(match.selectedDates));
    setHydrated(true);
  }, [votesQuery.isLoading, votes, voter, hydrated]);

  const submitVote = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${event.id}/votes`, {
        voterName: voter.name,
        voterEmail: voter.email,
        selectedDates: Array.from(selected),
      });
      return res.json();
    },
    onSuccess: () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(voter)); } catch {}
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/votes`] });
      toast({ title: "Thanks!", description: "Your availability has been saved." });
    },
    onError: () => toast({ title: "Could not save", description: "Please try again.", variant: "destructive" }),
  });

  const addDatesMutation = useMutation({
    mutationFn: async (dates: string[]) => {
      const res = await apiRequest("POST", `/api/events/${event.id}/candidate-dates`, { hostToken, dates });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      setExtraDates([]);
      setAddOpen(false);
      toast({ title: "Dates added", description: "Guests can now vote on the new dates too." });
    },
    onError: () => toast({ title: "Could not add dates", description: "Please try again.", variant: "destructive" }),
  });

  const finalizeMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await apiRequest("POST", `/api/events/${event.id}/finalize`, {
        date,
        time: finalizeTime || null,
        durationMinutes: finalizeDuration,
        hostToken,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/stats`] });
      toast({ title: "Date locked in!", description: "Guests can now sign up for items." });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({ title: "Could not finalize", description: message, variant: "destructive" });
    },
  });

  const tally = candidateDates.map((d) => {
    const voters = votes.filter((v) => v.selectedDates.includes(d));
    return { date: d, count: voters.length, voters };
  });
  const maxCount = tally.reduce((m, t) => Math.max(m, t.count), 0);
  const totalVoters = votes.length;

  const toggle = (date: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voter.name.trim()) {
      toast({ title: "Name required", description: "Please enter your name first.", variant: "destructive" });
      return;
    }
    submitVote.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="flex items-start gap-3 surface-callout border-teal-100 bg-teal-50 p-5">
        <span className="icon-chip-sm bg-card shadow-sm">
          <CalendarCheck className="h-4 w-4 text-teal-500" />
        </span>
        <div>
          <p className="font-serif font-semibold text-foreground">Picking a date together</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isHost
              ? "Share the link so guests can mark which dates work. You can also set up the food list below — it'll be ready once you lock in a date."
              : "The host hasn't locked in a date yet. Check every date that works for you below."}
          </p>
        </div>
      </div>

      {/* Voter form */}
      {!isHost && (
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Mark your availability</CardTitle>
            <CardDescription>
              Tap every date that could work for you. You can come back and update anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="voter-name">Your name</Label>
                  <Input
                    id="voter-name"
                    value={voter.name}
                    onChange={(e) => setVoter({ ...voter, name: e.target.value })}
                    placeholder="Alex Smith"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="voter-email">Email (optional)</Label>
                  <Input
                    id="voter-email"
                    type="email"
                    value={voter.email}
                    onChange={(e) => setVoter({ ...voter, email: e.target.value })}
                    placeholder="alex@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {candidateDates.map((d) => {
                  const isSelected = selected.has(d);
                  return (
                    <label
                      key={d}
                      htmlFor={`date-${d}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-primary bg-terracotta-50 ring-1 ring-primary"
                          : "border-border bg-card hover:border-sand-400"
                      }`}
                    >
                      <Checkbox
                        id={`date-${d}`}
                        checked={isSelected}
                        onCheckedChange={() => toggle(d)}
                      />
                      <div>
                        <p className="font-medium text-foreground">{format(parseISO(d), "EEEE, MMM d")}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(d), "yyyy")}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 rounded-full h-12 text-base font-medium shadow-sm" disabled={submitVote.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {submitVote.isPending ? "Saving…" : "Save my availability"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tally / host panel */}
      <Card className="surface-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 font-serif text-xl">
                <span className="icon-chip-sm bg-sage-100">
                  {isHost
                    ? <Crown className="h-4 w-4 text-sage-600" />
                    : <Users className="h-4 w-4 text-sage-600" />}
                </span>
                Results so far
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {totalVoters} {totalVoters === 1 ? "person has" : "people have"} voted
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Host-only controls */}
          {isHost && (
            <div className="space-y-3 surface-callout border-sand-200 bg-sand-100 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="finalize-time" className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    Event time (optional)
                  </Label>
                  <Input
                    id="finalize-time"
                    type="time"
                    value={finalizeTime}
                    onChange={(e) => setFinalizeTime(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="finalize-duration" className="flex items-center gap-2 text-sm">
                    <Hourglass className="h-4 w-4" />
                    How long?
                  </Label>
                  <Select
                    value={String(finalizeDuration)}
                    onValueChange={(v) => setFinalizeDuration(parseInt(v))}
                  >
                    <SelectTrigger id="finalize-duration" className="w-44" data-testid="select-finalize-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set a time and duration before locking in the date (time can be left blank).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-sand-200 pt-3">
                <Popover open={addOpen} onOpenChange={setAddOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" data-testid="button-add-candidate-dates">
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Add more candidate dates
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Pick extra days you'd like to offer guests.
                    </p>
                    <DateCalendar
                      mode="multiple"
                      selected={extraDates}
                      onSelect={(days) => setExtraDates(days || [])}
                      disabled={(date) => {
                        if (date < today) return true;
                        return candidateDates.includes(format(date, "yyyy-MM-dd"));
                      }}
                      fromDate={today}
                      toDate={fourWeeksOut}
                      numberOfMonths={1}
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setExtraDates([]); setAddOpen(false); }}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 rounded-full"
                        disabled={extraDates.length === 0 || addDatesMutation.isPending}
                        onClick={() => {
                          const iso = extraDates
                            .map((d) => format(d, "yyyy-MM-dd"))
                            .filter((d) => !candidateDates.includes(d));
                          if (iso.length === 0) return;
                          addDatesMutation.mutate(iso);
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        {addDatesMutation.isPending ? "Adding…" : `Add ${extraDates.length || ""}`.trim()}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Existing votes are preserved.</p>
              </div>
            </div>
          )}

          {tally.length === 0 && (
            <p className="text-sm text-muted-foreground">No candidate dates set.</p>
          )}

          {tally.map((row) => {
            const isLeader = row.count > 0 && row.count === maxCount;
            const pct = totalVoters > 0 ? Math.round((row.count / totalVoters) * 100) : 0;
            return (
              <div
                key={row.date}
                className={`surface-callout p-4 transition-all ${
                  isLeader
                    ? "border-sage-200 bg-sage-50"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isLeader && <Trophy className="h-4 w-4 text-sage-600" />}
                    <div>
                      <p className="font-semibold text-foreground">
                        {format(parseISO(row.date), "EEEE, MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.count} {row.count === 1 ? "vote" : "votes"}
                        {totalVoters > 0 && ` · ${pct}%`}
                      </p>
                    </div>
                  </div>
                  {isHost && (
                    <Button
                      size="sm"
                      onClick={() => finalizeMutation.mutate(row.date)}
                      disabled={finalizeMutation.isPending}
                      className={isLeader ? "bg-sage-600 hover:bg-sage-700 text-white shadow-sm" : ""}
                      variant={isLeader ? "default" : "outline"}
                    >
                      Finalize this date
                    </Button>
                  )}
                </div>
                {totalVoters > 0 && (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${isLeader ? "bg-sage-500" : "bg-sand-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {row.voters.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.voters.map((v) => (
                      <span
                        key={v.id}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground"
                      >
                        {v.voterName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
