import { HootHome, type Palette } from "./_shared/HootHome";

const palette: Palette = {
  name: "Current — Terracotta + Sage",
  bg: "hsl(52, 65%, 93%)",
  fg: "hsl(20, 20%, 14%)",
  muted: "hsl(35, 45%, 88%)",
  mutedFg: "hsl(30, 12%, 46%)",
  card: "#ffffff",
  border: "hsl(35, 35%, 83%)",
  primary: "hsl(14, 56%, 51%)",
  primaryFg: "#ffffff",
  pillBg: "hsl(14, 70%, 94%)",
  pillFg: "hsl(14, 56%, 42%)",
  okBg: "hsl(164, 30%, 42%)",
  okFg: "hsl(164, 30%, 38%)",
  iconChipBg: "hsl(188, 50%, 95%)",
  iconChipBorder: "hsl(188, 50%, 86%)",
  iconChipInner: "hsl(188, 52%, 50%)",
  serif: "Lora, Georgia, serif",
  loserBar: "hsl(35, 51%, 70%)",
  avatars: [
    { letter: "J", bg: "hsl(35, 60%, 86%)", fg: "hsl(35, 60%, 35%)" },
    { letter: "K", bg: "hsl(14, 70%, 94%)", fg: "hsl(14, 56%, 42%)" },
    { letter: "A", bg: "hsl(188, 50%, 92%)", fg: "hsl(188, 52%, 40%)" },
    { letter: "B", bg: "hsl(164, 30%, 90%)", fg: "hsl(164, 30%, 35%)" },
    { letter: "R", bg: "hsl(14, 70%, 94%)", fg: "hsl(14, 56%, 50%)" },
  ],
};

export function Current() {
  return <HootHome palette={palette} />;
}
