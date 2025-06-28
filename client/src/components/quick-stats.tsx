import { CheckCircle, Clock, List } from "lucide-react";

interface QuickStatsProps {
  stats: {
    total: number;
    claimed: number;
    available: number;
    custom: number;
  };
}

export default function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
