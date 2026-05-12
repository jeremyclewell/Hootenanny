const NAME_KEY = "hootenanny-guest-name";
const EMAIL_KEY = "hootenanny-guest-email";

export function getGuestName(): string {
  try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; }
}

export function setGuestName(name: string): void {
  try { localStorage.setItem(NAME_KEY, name); } catch {}
}

export function getGuestEmail(): string {
  try { return localStorage.getItem(EMAIL_KEY) || ""; } catch { return ""; }
}

export function setGuestEmail(email: string): void {
  try { localStorage.setItem(EMAIL_KEY, email); } catch {}
}
