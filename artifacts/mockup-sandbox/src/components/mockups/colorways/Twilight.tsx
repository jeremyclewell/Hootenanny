import { EventPage, type EventPalette } from "./_shared/EventPage";

// "Twilight" — faithful to the reference: deep indigo hero with string lights,
// vibrant violet primary CTA, and soft pastel status cards on a near-white page.
const palette: EventPalette = {
  name: "Twilight — Indigo Hero + Violet",
  pageBg: "hsl(255, 40%, 98%)",
  fg: "hsl(255, 28%, 16%)",
  mutedFg: "hsl(255, 12%, 48%)",
  card: "#ffffff",
  border: "hsl(255, 28%, 92%)",

  primary: "hsl(258, 78%, 62%)",
  primaryFg: "#ffffff",
  primaryGradient: "linear-gradient(135deg, hsl(258, 80%, 64%), hsl(268, 75%, 55%))",
  primarySoft: "hsl(258, 80%, 95%)",
  primarySoftFg: "hsl(258, 60%, 50%)",

  heroGradient:
    "linear-gradient(140deg, hsl(255, 42%, 22%) 0%, hsl(258, 50%, 28%) 50%, hsl(265, 58%, 32%) 100%)",
  heroFg: "#ffffff",
  heroMutedFg: "hsla(0, 0%, 100%, 0.65)",
  heroChipBg: "hsla(0, 0%, 100%, 0.10)",
  heroChipFg: "#ffffff",
  heroPillBg: "hsla(0, 0%, 100%, 0.12)",
  heroPillFg: "hsla(0, 0%, 100%, 0.92)",

  going: { bg: "hsl(150, 50%, 94%)", iconBg: "hsl(150, 45%, 84%)", iconFg: "hsl(150, 50%, 32%)", ink: "hsl(150, 40%, 20%)" },
  maybe: { bg: "hsl(40, 80%, 94%)",  iconBg: "hsl(40, 75%, 84%)",  iconFg: "hsl(35, 65%, 38%)",  ink: "hsl(35, 50%, 22%)" },
  cant:  { bg: "hsl(355, 75%, 95%)", iconBg: "hsl(355, 70%, 88%)", iconFg: "hsl(355, 60%, 50%)", ink: "hsl(355, 45%, 25%)" },

  tileNote:  { bg: "hsl(258, 60%, 96%)", iconFg: "hsl(258, 60%, 52%)" },
  tileLink:  { bg: "hsl(195, 65%, 95%)", iconFg: "hsl(195, 60%, 42%)" },
  tilePhoto: { bg: "hsl(150, 50%, 94%)", iconFg: "hsl(150, 50%, 36%)" },
  tilePoll:  { bg: "hsl(35, 80%, 94%)",  iconFg: "hsl(35, 70%, 42%)" },

  serif: "'Fraunces', Lora, Georgia, serif",
  navActiveBg: "hsl(255, 42%, 18%)",
  navActiveFg: "#ffffff",
};

export function Twilight() {
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
