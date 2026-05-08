import { Apple, Cake, Drumstick, GlassWater, Leaf, UtensilsCrossed } from "lucide-react";

export interface CategoryConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORIES: CategoryConfig[] = [
  { id: "main-dishes", name: "Main dishes",   icon: Drumstick },
  { id: "sides",       name: "Sides & salads", icon: Leaf },
  { id: "appetizers",  name: "Appetizers",    icon: Apple },
  { id: "desserts",    name: "Desserts",      icon: Cake },
  { id: "beverages",   name: "Beverages",     icon: GlassWater },
];

const CATEGORY_BY_ID: Record<string, CategoryConfig> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export function getCategory(id: string): CategoryConfig {
  return CATEGORY_BY_ID[id] ?? { id, name: id, icon: UtensilsCrossed };
}
