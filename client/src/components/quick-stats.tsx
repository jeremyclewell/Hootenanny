import { CheckCircle, Clock, List, UserCheck, HelpCircle } from "lucide-react";

interface QuickStatsProps {
  stats: {
    total: number;
    claimed: number;
    available: number;
    custom: number;
  };
  rsvpStats?: {
    going: number;
    maybe: number;
  };
}

const tiles = [
  {
    key: "going",
    rsvpOnly: true,
    icon: UserCheck,
    iconBg: "bg-sage-100",
    iconColor: "text-sage-600",
    label: "Going",
    getValue: (_: QuickStatsProps["stats"], r?: QuickStatsProps["rsvpStats"]) => r?.going ?? 0,
  },
  {
    key: "maybe",
    rsvpOnly: true,
    icon: HelpCircle,
    iconBg: "bg-sand-100",
    iconColor: "text-sand-600",
    label: "Maybe",
    getValue: (_: QuickStatsProps["stats"], r?: QuickStatsProps["rsvpStats"]) => r?.maybe ?? 0,
  },
  {
    key: "claimed",
    rsvpOnly: false,
    icon: CheckCircle,
    iconBg: "bg-terracotta-100",
    iconColor: "text-primary",
    label: "Items Claimed",
    getValue: (s: QuickStatsProps["stats"]) => s.claimed,
  },
  {
    key: "available",
    rsvpOnly: false,
    icon: Clock,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-500",
    label: "Still Available",
    getValue: (s: QuickStatsProps["stats"]) => s.available,
  },
  {
    key: "total",
    rsvpOnly: false,
    icon: List,
    iconBg: "bg-sage-100",
    iconColor: "text-sage-600",
    label: "Total Items",
    getValue: (s: QuickStatsProps["stats"]) => s.total,
  },
];

export default function QuickStats({ stats, rsvpStats }: QuickStatsProps) {
  const showRsvp = !!rsvpStats;
  const visibleTiles = showRsvp ? tiles : tiles.filter((t) => !t.rsvpOnly);
  const gridClass = showRsvp
    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
    : "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8";

  return (
    <div className={gridClass}>
      {visibleTiles.map((tile) => {
        const Icon = tile.icon;
        const value = tile.getValue(stats, rsvpStats);
        const testId = tile.key === "going" ? "quick-stat-going" : tile.key === "maybe" ? "quick-stat-maybe" : undefined;
        return (
          <div
            key={tile.key}
            className="bg-card rounded-xl border border-border shadow-warm p-4"
            data-testid={testId}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${tile.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${tile.iconColor}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{tile.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
