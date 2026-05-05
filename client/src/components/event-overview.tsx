import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, AlignLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Event, DateVote, Item } from "@shared/schema";

type PublicVote = Omit<DateVote, "voterEmail">;

interface EventOverviewProps {
  event: Event;
  items: Item[];
  stats: { total: number; claimed: number; available: number; custom: number };
  onViewDates: () => void;
  onViewPotluck: () => void;
}

export default function EventOverview({ event, items, stats, onViewDates, onViewPotluck }: EventOverviewProps) {
  const candidateDates = event.candidateDates || [];
  const showPoll = candidateDates.length > 0;

  const votesQuery = useQuery<PublicVote[]>({
    queryKey: [`/api/events/${event.id}/votes`],
    enabled: showPoll,
  });
  const votes = votesQuery.data || [];
  const totalVoters = votes.length;

  const tally = candidateDates.map((d) => {
    const count = votes.filter((v) => v.selectedDates.includes(d)).length;
    const pct = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
    return { date: d, count, pct };
  });
  const maxCount = tally.reduce((m, t) => Math.max(m, t.count), 0);
  const totalVotes = tally.reduce((sum, t) => sum + t.count, 0);

  const claimPct = stats.total > 0 ? Math.round((stats.claimed / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Vote-for-a-date preview */}
      {showPoll && (
        <div className="bg-card rounded-2xl border border-border shadow-warm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-foreground/70" />
              <h3 className="text-lg font-serif font-semibold text-foreground">Vote for a date</h3>
              <span className="inline-flex items-center rounded-full bg-terracotta-50 border border-terracotta-100 px-2 py-0.5 text-xs font-medium text-primary">
                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onViewDates} data-testid="overview-view-dates">
              View all
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Tap your favorite. You can change your vote anytime.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tally.slice(0, 3).map((row) => {
              const date = parseISO(row.date);
              const isLeader = row.count > 0 && row.count === maxCount;
              return (
                <button
                  key={row.date}
                  onClick={onViewDates}
                  className={`text-left rounded-xl border p-3 transition-all hover:border-primary/40 ${
                    isLeader ? "border-primary/60 bg-terracotta-50/50 ring-1 ring-primary/30" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-sand-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">
                        {format(date, "MMM")}
                      </span>
                      <span className="text-base font-serif font-bold text-foreground leading-tight">
                        {format(date, "d")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">{format(date, "EEEE")}</p>
                        {isLeader && totalVoters > 0 && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                            Top pick
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {row.count} {row.count === 1 ? "vote" : "votes"}
                        {totalVoters > 0 && ` · ${row.pct}%`}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${isLeader ? "bg-primary" : "bg-sage-400"}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          {tally.length > 3 && (
            <p className="text-xs text-muted-foreground mt-3">
              + {tally.length - 3} more date{tally.length - 3 === 1 ? "" : "s"}. View all to see them.
            </p>
          )}
        </div>
      )}

      {/* Potluck progress preview */}
      {stats.total > 0 && (
        <button
          onClick={onViewPotluck}
          className="w-full text-left bg-card rounded-2xl border border-border shadow-warm p-6 hover:border-primary/30 transition-all"
          data-testid="overview-view-potluck"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlignLeft className="h-5 w-5 text-foreground/70" />
              <h3 className="text-lg font-serif font-semibold text-foreground">Potluck list</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{stats.claimed}</span> of {stats.total} claimed
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-sage-400 transition-all"
              style={{ width: `${claimPct}%` }}
            />
          </div>
          {items.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {items.slice(0, 6).map((item) => (
                <span
                  key={item.id}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${
                    item.claimedBy
                      ? "bg-sage-50 border border-sage-100 text-sage-700 line-through"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.name}
                </span>
              ))}
              {items.length > 6 && (
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  +{items.length - 6} more
                </span>
              )}
            </div>
          )}
        </button>
      )}
    </div>
  );
}
