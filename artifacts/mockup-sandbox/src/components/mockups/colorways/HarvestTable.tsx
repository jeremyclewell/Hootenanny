import { HootHome, type Palette } from "./_shared/HootHome";

// "Harvest Table" — mulled-wine plum + olive/moss + oat + brass.
// A dinner-party-after-dark mood: deeper, richer, more grown-up than terracotta.
const palette: Palette = {
  name: "Harvest Table — Plum + Olive + Brass",
  bg: "hsl(38, 38%, 92%)",         // oat / linen
  fg: "hsl(345, 18%, 16%)",        // near-black with plum undertone
  muted: "hsl(38, 30%, 86%)",      // warm parchment
  mutedFg: "hsl(345, 8%, 42%)",
  card: "hsl(40, 50%, 98%)",       // cream paper
  border: "hsl(38, 25%, 80%)",
  primary: "hsl(345, 38%, 36%)",   // mulled wine plum
  primaryFg: "#ffffff",
  pillBg: "hsl(345, 40%, 92%)",
  pillFg: "hsl(345, 40%, 32%)",
  okBg: "hsl(75, 22%, 38%)",       // moss/olive
  okFg: "hsl(75, 22%, 32%)",
  iconChipBg: "hsl(38, 55%, 92%)", // brass tint
  iconChipBorder: "hsl(38, 55%, 70%)",
  iconChipInner: "hsl(38, 60%, 45%)", // brass
  serif: "'Cormorant Garamond', Lora, Georgia, serif",
  loserBar: "hsl(38, 40%, 72%)",
  avatars: [
    { letter: "J", bg: "hsl(38, 55%, 86%)", fg: "hsl(38, 55%, 32%)" },
    { letter: "K", bg: "hsl(345, 40%, 92%)", fg: "hsl(345, 40%, 36%)" },
    { letter: "A", bg: "hsl(75, 22%, 88%)", fg: "hsl(75, 22%, 32%)" },
    { letter: "B", bg: "hsl(28, 40%, 88%)", fg: "hsl(28, 40%, 32%)" },
    { letter: "R", bg: "hsl(345, 30%, 88%)", fg: "hsl(345, 38%, 40%)" },
  ],
};

export function HarvestTable() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap"
      />
      <HootHome palette={palette} />
    </>
  );
}
