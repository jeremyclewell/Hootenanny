import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Utensils, Plus, Calendar, Clock, CheckSquare, Square, AlignLeft } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Utensils className="text-white h-4 w-4" />
          </div>
          <span className="text-lg font-serif font-semibold text-foreground">Hootenanny</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/create">
            <Button variant="outline" size="sm" className="rounded-full border-border text-foreground hover:bg-muted/60 text-sm">
              See an example
            </Button>
          </Link>
          <Link href="/create">
            <Button size="sm" className="rounded-full bg-primary hover:bg-primary/90 text-sm px-4">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New event
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center px-6 sm:px-10 lg:px-16 py-10 lg:py-0">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* Left: copy */}
          <div className="flex flex-col gap-6 lg:gap-7">
            {/* Pill tag */}
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xl select-none">✦</span>
              <span className="inline-flex items-center gap-1.5 bg-terracotta-100 text-terracotta-600 text-sm font-medium px-3.5 py-1.5 rounded-full">
                <Plus className="h-3 w-3" />
                Plan a potluck in minutes
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[3.5rem] sm:text-[4.5rem] lg:text-[5rem] font-serif font-bold text-foreground leading-[1.05] tracking-tight">
              Gather the gang.<br />
              Bring all the<br />
              good stuff.
            </h1>

            {/* Body */}
            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              Themed events, date polls, and a potluck list everyone can claim from.
              One link, no spreadsheets, no group-chat chaos.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link href="/create">
                <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90 px-6 font-medium">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create new event
                </Button>
              </Link>
              <Link href="/create">
                <Button size="lg" variant="outline" className="rounded-full border-border text-foreground hover:bg-muted/60 px-6 font-medium">
                  See an example
                </Button>
              </Link>
            </div>

            {/* Trust */}
            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="text-sage-600">✓</span> No sign-up to RSVP
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-sage-600">✓</span> Free for everyone
              </span>
            </div>
          </div>

          {/* Right: floating UI mockup cards */}
          <div className="relative h-[420px] sm:h-[460px] lg:h-[500px] hidden sm:block">

            {/* Card 1: Event card (top, larger) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/4 w-[320px] bg-card rounded-2xl border border-border shadow-warm-lg p-4 z-10">
              {/* RSVP badge */}
              <div className="absolute -top-3 right-4 bg-sage-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                RSVP'D <span>✓</span>
              </div>
              {/* Card header */}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border-2 border-teal-100 flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 rounded-full border-2 border-teal-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm leading-tight">Sunday Garden Picnic</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Sun, Jun 14
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> 2:00 PM
                    </span>
                  </div>
                </div>
              </div>
              {/* Divider */}
              <div className="border-t border-dashed border-border my-3" />
              {/* Footer */}
              <div className="flex items-center gap-2">
                {/* Avatars */}
                <div className="flex -space-x-1.5">
                  {[
                    { letter: "J", bg: "bg-sand-200 text-sand-600" },
                    { letter: "K", bg: "bg-terracotta-100 text-terracotta-600" },
                    { letter: "A", bg: "bg-teal-100 text-teal-500" },
                    { letter: "B", bg: "bg-sage-100 text-sage-600" },
                  ].map(({ letter, bg }) => (
                    <div key={letter} className={`w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-xs font-medium ${bg}`}>
                      {letter}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">9 going</span> · 12 items claimed
                </span>
              </div>
            </div>

            {/* Card 2: Top date pick (bottom-left) */}
            <div className="absolute bottom-10 left-0 w-[190px] bg-card rounded-2xl border border-border shadow-warm p-3.5 z-10">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Top date pick</p>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">JUN</p>
                  <p className="text-3xl font-bold text-foreground leading-none mt-0.5">14</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Sunday</p>
                  <p className="text-xs text-muted-foreground mt-0.5">7 votes</p>
                </div>
              </div>
            </div>

            {/* Card 3: Potluck list (bottom-right) */}
            <div className="absolute bottom-0 right-0 w-[220px] bg-card rounded-2xl border border-border shadow-warm p-3.5 z-20">
              {/* Header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  Potluck list
                </div>
                <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">8</span>
              </div>
              {/* Items */}
              <div className="space-y-2">
                {[
                  { label: "Apple pie", person: "Mae", done: true },
                  { label: "Lemonade", person: "Theo", done: true },
                  { label: "Coleslaw", person: "", done: false },
                ].map(({ label, person, done }) => (
                  <div key={label} className="flex items-center gap-2">
                    {done
                      ? <CheckSquare className="h-3.5 w-3.5 text-sage-600 shrink-0" />
                      : <Square className="h-3.5 w-3.5 text-border shrink-0" />
                    }
                    <span className={`flex-1 text-xs ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {label}
                    </span>
                    {person && <span className="text-xs text-muted-foreground">{person}</span>}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
