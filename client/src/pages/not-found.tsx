import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Compass, Utensils } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border shadow-warm px-6 sm:px-10 lg:px-16 py-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer w-fit">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <Utensils className="text-white h-4 w-4" />
            </div>
            <span className="text-lg font-serif font-semibold text-foreground">Hootenanny</span>
          </div>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-warm border-border">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta-50 border border-terracotta-100">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
              Page not found
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              We couldn't find that hootenanny. The link might be wrong, or the
              event may have been removed.
            </p>
            <Link href="/">
              <Button className="rounded-full bg-primary hover:bg-primary/90 px-5">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
