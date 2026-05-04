import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Utensils, Plus, Users, Calendar, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-warm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <Utensils className="text-white h-5 w-5" />
              </div>
              <span className="text-xl font-serif font-semibold text-foreground">Hootenanny</span>
            </div>
            <Link href="/create">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="mr-1.5 h-4 w-4" />
                New Event
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-terracotta-100 via-background to-sand-100 opacity-60" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-sand-200 px-4 py-1.5 text-sm font-medium text-sand-600 mb-6">
            <span>🎉</span> The easiest way to plan a potluck
          </div>
          <h1 className="text-5xl sm:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
            Plan the Perfect<br />
            <span className="text-primary">Hootenanny</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Create themed potluck events, let guests vote on a date, and coordinate who's bringing what — all from a single link.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 shadow-warm-lg">
                <Plus className="mr-2 h-5 w-5" />
                Create New Event
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Calendar,
              iconBg: "bg-terracotta-100",
              iconColor: "text-primary",
              title: "Themed Menus",
              desc: "BBQ, pool party, Thanksgiving, kids party — every theme comes preloaded with the right food and drink items.",
            },
            {
              icon: Users,
              iconBg: "bg-teal-100",
              iconColor: "text-teal-500",
              title: "Easy Sign-ups",
              desc: "Share one link. Guests RSVP, vote on dates, and claim what they'll bring — no account needed.",
            },
            {
              icon: Plus,
              iconBg: "bg-sage-100",
              iconColor: "text-sage-600",
              title: "Fully Flexible",
              desc: "Add your own items, edit the list, and let guests suggest additions. You're always in control.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-card rounded-2xl border border-border p-6 shadow-warm hover:shadow-warm-lg transition-shadow"
            >
              <div className={`w-12 h-12 ${f.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                <f.icon className={`h-6 w-6 ${f.iconColor}`} />
              </div>
              <h3 className="text-lg font-serif font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/create">
            <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-terracotta-50">
              Get started — it's free
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
