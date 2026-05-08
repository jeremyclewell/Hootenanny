import { EventPage, type EventPalette } from "./_shared/EventPage";

// "Aurora" — same dark-hero structure, swapped for a warmer accent:
// midnight-teal hero with a coral/sunset CTA. Same vibe, different temperature.
const palette: EventPalette = {
  name: "Aurora — Midnight Teal + Coral",
  pageBg: "hsl(20, 40%, 98%)",
  fg: "hsl(220, 25%, 16%)",
  mutedFg: "hsl(220, 10%, 48%)",
  card: "#ffffff",
  border: "hsl(20, 25%, 92%)",

  primary: "hsl(8, 82%, 62%)",
  primaryFg: "#ffffff",
  primaryGradient: "linear-gradient(135deg, hsl(14, 88%, 64%), hsl(355, 78%, 58%))",
  primarySoft: "hsl(14, 80%, 95%)",
  primarySoftFg: "hsl(8, 70%, 50%)",

  heroGradient:
    "linear-gradient(140deg, hsl(210, 45%, 18%) 0%, hsl(195, 50%, 22%) 50%, hsl(180, 50%, 26%) 100%)",
  heroFg: "#ffffff",
  heroMutedFg: "hsla(0, 0%, 100%, 0.65)",
  heroChipBg: "hsla(0, 0%, 100%, 0.10)",
  heroChipFg: "#ffffff",
  heroPillBg: "hsla(0, 0%, 100%, 0.12)",
  heroPillFg: "hsla(0, 0%, 100%, 0.92)",

  going: { bg: "hsl(160, 45%, 94%)", iconBg: "hsl(160, 42%, 82%)", iconFg: "hsl(165, 55%, 28%)", ink: "hsl(165, 40%, 18%)" },
  maybe: { bg: "hsl(38, 85%, 94%)",  iconBg: "hsl(38, 80%, 82%)",  iconFg: "hsl(32, 70%, 38%)",  ink: "hsl(32, 50%, 22%)" },
  cant:  { bg: "hsl(8, 80%, 95%)",   iconBg: "hsl(8, 75%, 88%)",   iconFg: "hsl(8, 65%, 50%)",   ink: "hsl(8, 45%, 25%)" },

  tileNote:  { bg: "hsl(14, 70%, 96%)",  iconFg: "hsl(14, 70%, 50%)" },
  tileLink:  { bg: "hsl(195, 60%, 95%)", iconFg: "hsl(195, 55%, 38%)" },
  tilePhoto: { bg: "hsl(160, 45%, 94%)", iconFg: "hsl(165, 50%, 32%)" },
  tilePoll:  { bg: "hsl(45, 80%, 93%)",  iconFg: "hsl(38, 70%, 40%)" },

  serif: "'Fraunces', Lora, Georgia, serif",
  navActiveBg: "hsl(210, 38%, 16%)",
  navActiveFg: "#ffffff",
};

export function Aurora() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap"
      />
      <EventPage palette={palette} />
    </>
  );
}
