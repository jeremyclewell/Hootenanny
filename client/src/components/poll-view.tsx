import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarCheck, CheckCircle2, Clock, Crown, Trophy, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Event, DateVote } from "@shared/schema";

interface PollViewProps {
  event: Event;
  isHost: boolean;
  hostToken: string | null;
}

const STORAGE_KEY = "hootenanny-voter";

interface StoredVoter {
  name: string;
  email: string;
}

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

  const votesQuery = useQuery<DateVote[]>({
    queryKey: [`/api/events/${event.id}/votes`],
  });

  const votes = votesQuery.data || [];

  // Pre-fill selection from existing vote that matches the saved voter identity
  useEffect(() => {
    if (hydrated || votesQuery.isLoading) return;
    const match = votes.find(
      (v) =>
        v.voterName.trim().toLowerCase() === voter.name.trim().toLowerCase() &&
        (v.voterEmail || "").trim().toLowerCase() === voter.email.trim().toLowerCase() &&
        voter.name.trim().length > 0
    );
    if (match) {
      setSelected(new Set(match.selectedDates));
    }
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(voter));
      } catch {}
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/votes`] });
      toast({
        title: "Thanks!",
        description: "Your availability has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Could not save",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await apiRequest("POST", `/api/events/${event.id}/finalize`, {
        date,
        time: finalizeTime || null,
        hostToken,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/stats`] });
      toast({
        title: "Date locked in!",
        description: "Guests can now sign up for items.",
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({
        title: "Could not finalize",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Tally votes per candidate date
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
      toast({
        title: "Name required",
        description: "Please enter your name first.",
        variant: "destructive",
      });
      return;
    }
    submitVote.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-6">
          <CalendarCheck className="mt-1 h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold text-gray-900">Picking a date together</p>
            <p className="text-sm text-gray-700">
              {isHost
                ? "Share the link with your guests so they can mark which dates work for them. Pick the winning date when you're ready."
                : "The host hasn't locked in a date yet. Mark the dates that work for you below."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voter form */}
      {!isHost && (
        <Card>
          <CardHeader>
            <CardTitle>Mark your availability</CardTitle>
            <CardDescription>
              Tap every date that could work for you. You can come back and update this anytime.
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
                      className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${
                        isSelected ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <Checkbox
                        id={`date-${d}`}
                        checked={isSelected}
                        onCheckedChange={() => toggle(d)}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(parseISO(d), "EEEE, MMM d")}
                        </p>
                        <p className="text-xs text-gray-500">{format(parseISO(d), "yyyy")}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <Button type="submit" className="w-full" disabled={submitVote.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {submitVote.isPending ? "Saving..." : "Save my availability"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tally / host panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isHost && <Crown className="h-5 w-5 text-amber-500" />}
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
          {isHost && (
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
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
              <p className="text-xs text-gray-600">
                Pick a start time before locking in the date. You can leave it blank.
              </p>
            </div>
          )}
          {tally.length === 0 && (
            <p className="text-sm text-gray-500">No candidate dates set.</p>
          )}
          {tally.map((row) => {
            const isLeader = row.count > 0 && row.count === maxCount;
            const pct = totalVoters > 0 ? Math.round((row.count / totalVoters) * 100) : 0;
            return (
              <div
                key={row.date}
                className={`rounded-lg border p-4 ${
                  isLeader ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isLeader && <Trophy className="h-4 w-4 text-amber-500" />}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {format(parseISO(row.date), "EEEE, MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-gray-600">
                        {row.count} {row.count === 1 ? "vote" : "votes"}
                        {totalVoters > 0 && ` • ${pct}%`}
                      </p>
                    </div>
                  </div>
                  {isHost && (
                    <Button
                      size="sm"
                      onClick={() => finalizeMutation.mutate(row.date)}
                      disabled={finalizeMutation.isPending}
                      variant={isLeader ? "default" : "outline"}
                    >
                      Finalize this date
                    </Button>
                  )}
                </div>
                {totalVoters > 0 && (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full ${isLeader ? "bg-amber-400" : "bg-primary/60"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {row.voters.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.voters.map((v) => (
                      <span
                        key={v.id}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
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
