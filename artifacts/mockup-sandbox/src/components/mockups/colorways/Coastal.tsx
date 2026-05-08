import { HootHome, type Palette } from "./_shared/HootHome";

// "Coastal" — washed indigo + sea glass + warm sand.
// A quieter, breezier mood — Sunday-brunch-by-the-water vs. backyard-bonfire.
const palette: Palette = {
  name: "Coastal — Indigo + Sea Glass + Sand",
  bg: "hsl(36, 45%, 94%)",         // warm sand
  fg: "hsl(215, 28%, 18%)",        // deep navy ink
  muted: "hsl(36, 35%, 88%)",
  mutedFg: "hsl(215, 12%, 45%)",
  card: "#ffffff",
  border: "hsl(36, 28%, 82%)",
  primary: "hsl(215, 42%, 38%)",   // washed indigo
  primaryFg: "#ffffff",
  pillBg: "hsl(215, 50%, 93%)",
  pillFg: "hsl(215, 45%, 32%)",
  okBg: "hsl(168, 30%, 42%)",      // sea glass green-blue
  okFg: "hsl(168, 32%, 35%)",
  iconChipBg: "hsl(168, 40%, 93%)",
  iconChipBorder: "hsl(168, 40%, 82%)",
  iconChipInner: "hsl(168, 38%, 45%)",
  serif: "'Fraunces', Lora, Georgia, serif",
  loserBar: "hsl(36, 40%, 75%)",
  avatars: [
    { letter: "J", bg: "hsl(36, 50%, 88%)", fg: "hsl(36, 50%, 32%)" },
    { letter: "K", bg: "hsl(215, 50%, 93%)", fg: "hsl(215, 45%, 36%)" },
    { letter: "A", bg: "hsl(168, 40%, 90%)", fg: "hsl(168, 38%, 32%)" },
    { letter: "B", bg: "hsl(195, 45%, 90%)", fg: "hsl(195, 45%, 32%)" },
    { letter: "R", bg: "hsl(20, 45%, 90%)", fg: "hsl(20, 50%, 38%)" },
  ],
};

export function Coastal() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap"
      />
      <HootHome palette={palette} />
    </>
  );
}
