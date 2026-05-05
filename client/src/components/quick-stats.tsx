import { CheckCircle, List, UserCheck, HelpCircle, Calendar } from "lucide-react";

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
  voteCount?: number;
  showVotes?: boolean;
}

interface Tile {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  testId?: string;
}

export default function QuickStats({ stats, rsvpStats, voteCount = 0, showVotes = false }: QuickStatsProps) {
  const tiles: Tile[] = [];

  if (rsvpStats) {
    tiles.push({
      key: "going",
      icon: UserCheck,
      iconBg: "bg-sage-50",
      iconColor: "text-sage-600",
      label: "Going",
      value: rsvpStats.going,
      testId: "quick-stat-going",
    });
    tiles.push({
      key: "maybe",
      icon: HelpCircle,
      iconBg: "bg-sand-100",
      iconColor: "text-sand-600",
      label: "Maybe",
      value: rsvpStats.maybe,
      testId: "quick-stat-maybe",
    });
  }

  tiles.push({
    key: "claimed",
    icon: CheckCircle,
    iconBg: "bg-terracotta-50",
    iconColor: "text-primary",
    label: "Items claimed",
    value: stats.claimed,
  });
  tiles.push({
    key: "available",
    icon: List,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-500",
    label: "Still open",
    value: stats.available,
  });

  if (showVotes) {
    tiles.push({
      key: "votes",
      icon: Calendar,
      iconBg: "bg-terracotta-50",
      iconColor: "text-primary",
      label: "Date votes",
      value: voteCount,
    });
  }

  const cols = tiles.length;
  const gridClass =
    cols === 5 ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
    : cols === 4 ? "grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
    : "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6";

  return (
    <div className={gridClass}>
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.key}
            className="bg-card rounded-2xl border border-border shadow-warm p-4"
            data-testid={tile.testId}
          >
            <div className={`w-9 h-9 ${tile.iconBg} rounded-lg flex items-center justify-center mb-4`}>
              <Icon className={`h-4 w-4 ${tile.iconColor}`} />
            </div>
            <p className="text-3xl font-serif font-semibold text-foreground leading-none mb-2">{tile.value}</p>
            <p className="text-xs text-muted-foreground">{tile.label}</p>
          </div>
        );
      })}
    </div>
  );
}
