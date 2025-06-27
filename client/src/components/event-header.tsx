import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Share, Utensils, MapPin, Users, Calendar } from "lucide-react";
import type { Event } from "@shared/schema";

interface EventHeaderProps {
  event: Event;
}

export default function EventHeader({ event }: EventHeaderProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description || `Join ${event.title} potluck event!`,
          url,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link Copied!",
          description: "Event link has been copied to your clipboard.",
        });
      } catch (error) {
        toast({
          title: "Share",
          description: `Share this link: ${url}`,
        });
      }
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'pool-party':
        return '🏊‍♀️';
      case 'bbq':
        return '🔥';
      case 'kids-party':
        return '🎂';
      case 'thanksgiving':
        return '🦃';
      default:
        return '🍽️';
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Utensils className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Potluck Planner</h1>
                <p className="text-sm text-gray-500">{event.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={handleShare} className="bg-primary hover:bg-primary/90">
                <Share className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Event Info */}
      <div className="bg-white rounded-xl shadow-material p-6 mb-8 max-w-7xl mx-auto mt-8 mx-4 sm:mx-6 lg:mx-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">{getThemeIcon(event.theme)}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
                {event.date && (
                  <p className="text-gray-600">{event.date}</p>
                )}
              </div>
            </div>
            {event.description && (
              <p className="text-gray-700 mb-4">{event.description}</p>
            )}
            <div className="flex items-center space-x-6 text-sm text-gray-600 flex-wrap gap-2">
              {event.location && (
                <span className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  {event.location}
                </span>
              )}
              {event.expectedGuests && (
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  {event.expectedGuests} expected guests
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
