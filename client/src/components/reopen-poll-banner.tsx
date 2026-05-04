import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarRange, RotateCcw } from "lucide-react";
import type { Event } from "@shared/schema";

interface ReopenPollBannerProps {
  event: Event;
  hostToken: string | null;
}

export default function ReopenPollBanner({ event, hostToken }: ReopenPollBannerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [extraDates, setExtraDates] = useState<Date[]>([]);

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const fourWeeksOut = new Date(today);
  fourWeeksOut.setDate(fourWeeksOut.getDate() + 28);

  const reopenMutation = useMutation({
    mutationFn: async () => {
      const additionalDates = extraDates.map((d) => format(d, "yyyy-MM-dd"));
      const res = await apiRequest("POST", `/api/events/${event.id}/reopen`, {
        hostToken,
        additionalDates,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/votes`] });
      setExtraDates([]);
      setOpen(false);
      toast({
        title: "Polling reopened",
        description: "Guests can vote again. Their old votes were kept.",
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast({
        title: "Could not reopen polling",
        description: message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="mb-6 border-amber-300 bg-amber-50">
      <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6">
        <div className="flex items-start gap-3">
          <CalendarRange className="mt-1 h-5 w-5 text-amber-700" />
          <div>
            <p className="font-semibold text-gray-900">Plans changed?</p>
            <p className="text-sm text-gray-700">
              You can reopen polling on this event. Guests' previous votes and the items
              everyone has signed up for will be preserved.
            </p>
          </div>
        </div>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" data-testid="button-reopen-poll">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reopen polling
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reopen date polling?</AlertDialogTitle>
              <AlertDialogDescription>
                The current date{event.date ? ` (${event.date})` : ""} will be unset and added back
                into the candidate list so prior votes still count. Guests can vote again, and any
                items they've already claimed stay claimed. Optionally pick more dates to add to the
                poll.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-md border border-gray-200 p-2">
              <p className="mb-2 text-xs text-gray-600">
                Add additional candidate dates (optional):
              </p>
              <div className="flex justify-center">
                <DateCalendar
                  mode="multiple"
                  selected={extraDates}
                  onSelect={(days) => setExtraDates(days || [])}
                  disabled={(date) => date < today}
                  fromDate={today}
                  toDate={fourWeeksOut}
                  numberOfMonths={1}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={reopenMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  reopenMutation.mutate();
                }}
              >
                {reopenMutation.isPending ? "Reopening..." : "Yes, reopen polling"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
