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

export default function QuickStats({ stats, rsvpStats }: QuickStatsProps) {
  const showRsvp = !!rsvpStats;
  const gridClass = showRsvp
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
    : "grid grid-cols-1 md:grid-cols-3 gap-4 mb-8";

  return (
    <div className={gridClass}>
      {showRsvp && (
        <div
          className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
          data-testid="quick-stat-going"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{rsvpStats!.going}</p>
              <p className="text-sm text-gray-600">Going</p>
            </div>
          </div>
        </div>
      )}

      {showRsvp && (
        <div
          className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
          data-testid="quick-stat-maybe"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
              <HelpCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{rsvpStats!.maybe}</p>
              <p className="text-sm text-gray-600">Maybe</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.claimed}</p>
            <p className="text-sm text-gray-600">Items Claimed</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
            <p className="text-sm text-gray-600">Still Available</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <List className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Items</p>
          </div>
        </div>
      </div>
    </div>
  );
}
