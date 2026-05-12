import { Resend } from "resend";

// Resend integration — credentials fetched fresh on every call (tokens expire)
let connectionSettings: any;

async function getResendCredentials(): Promise<{ apiKey: string; fromEmail: string } | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? "repl " + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

    if (!hostname || !xReplitToken) return null;

    connectionSettings = await fetch(
      "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
      {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => data.items?.[0]);

    if (!connectionSettings?.settings?.api_key) return null;
    return {
      apiKey: connectionSettings.settings.api_key,
      fromEmail: "Hootenanny <notifications@email.hootenanny.events>",
    };
  } catch {
    return null;
  }
}

async function getResendClient() {
  const creds = await getResendCredentials();
  if (!creds) return null;
  return { client: new Resend(creds.apiKey), fromEmail: creds.fromEmail };
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function eventUrl(eventId: string, req: { protocol: string; hostname: string }): string {
  return `${req.protocol}://${req.hostname}/events/${eventId}`;
}

// ── Base email template ────────────────────────────────────────────────────────

function baseTemplate(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body { margin:0; padding:0; background:#f8f5f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width:560px; margin:32px auto; background:#ffffff; border-radius:16px; overflow:hidden; }
  .hero { background:linear-gradient(135deg,#0f4c4c 0%,#1a6b6b 100%); padding:32px 32px 24px; }
  .hero h1 { margin:8px 0 0; color:#ffffff; font-size:22px; font-weight:700; line-height:1.3; }
  .hero .logo { display:inline-flex; align-items:center; gap:8px; color:#a3d4d4; font-size:14px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; }
  .body { padding:28px 32px; }
  .detail-row { display:flex; gap:10px; align-items:flex-start; margin-bottom:10px; }
  .detail-row .icon { flex-shrink:0; width:20px; color:#0f4c4c; font-size:16px; }
  .detail-row .text { font-size:15px; color:#1a1a1a; }
  .detail-row .label { font-size:12px; color:#888; display:block; margin-bottom:1px; }
  .cta { display:inline-block; margin-top:24px; padding:14px 28px; background:#e05c3a; color:#ffffff; text-decoration:none; border-radius:999px; font-weight:600; font-size:15px; }
  .footer { padding:16px 32px 24px; font-size:12px; color:#aaa; }
  .divider { border:none; border-top:1px solid #f0ece6; margin:20px 0; }
  .tag { display:inline-block; background:#fff8f5; border:1px solid #f0ddd5; color:#c0552a; font-size:12px; padding:3px 10px; border-radius:999px; font-weight:500; }
</style>
</head>
<body>
<div class="wrapper">
${body}
</div>
</body>
</html>`;
}

// ── Email: RSVP confirmation to guest ─────────────────────────────────────────

export async function sendRsvpConfirmation(opts: {
  toEmail: string;
  guestName: string;
  response: string;
  plusOnes: number;
  event: { id: string; title: string; date: string | null; time: string | null; location: string | null };
  req: { protocol: string; hostname: string };
}) {
  const resend = await getResendClient();
  if (!resend) return;

  const { toEmail, guestName, response, plusOnes, event, req } = opts;

  const responseLabel =
    response === "yes" ? "You're going! 🎉" : response === "maybe" ? "You marked maybe" : "You marked can't make it";

  const dateStr = event.date ? formatDate(event.date) : null;
  const timeStr = event.time ? formatTime(event.time) : null;

  const html = baseTemplate(`
  <div class="hero">
    <div class="logo">🪕 Hootenanny</div>
    <h1>${responseLabel}</h1>
  </div>
  <div class="body">
    <p style="margin:0 0 20px;font-size:15px;color:#444;">
      Hey <strong>${guestName}</strong>, your RSVP for <strong>${event.title}</strong> has been saved.
    </p>
    ${dateStr ? `<div class="detail-row"><span class="icon">📅</span><span class="text"><span class="label">Date</span>${dateStr}${timeStr ? ` · ${timeStr}` : ""}</span></div>` : ""}
    ${event.location ? `<div class="detail-row"><span class="icon">📍</span><span class="text"><span class="label">Location</span>${event.location}</span></div>` : ""}
    ${plusOnes > 0 ? `<div class="detail-row"><span class="icon">👥</span><span class="text"><span class="label">Plus ones</span>You're bringing ${plusOnes} guest${plusOnes > 1 ? "s" : ""}</span></div>` : ""}
    <hr class="divider" />
    <p style="margin:0;font-size:14px;color:#666;">
      You can update your RSVP or claim items to bring at any time.
    </p>
    <a href="${eventUrl(event.id, req)}" class="cta">View event</a>
  </div>
  <div class="footer">
    You're receiving this because you RSVPd to a Hootenanny event. No account needed to unsubscribe — just don't click anything!
  </div>`);

  try {
    await resend.client.emails.send({
      from: resend.fromEmail,
      to: toEmail,
      subject: `RSVP confirmed: ${event.title}`,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send RSVP confirmation:", err);
  }
}

// ── Email: new RSVP notification to host ──────────────────────────────────────

export async function sendHostRsvpNotification(opts: {
  hostEmail: string;
  hostName: string;
  guestName: string;
  response: string;
  plusOnes: number;
  event: { id: string; title: string };
  totalRsvps: number;
  req: { protocol: string; hostname: string };
}) {
  const resend = await getResendClient();
  if (!resend) return;

  const { hostEmail, hostName, guestName, response, plusOnes, event, totalRsvps, req } = opts;

  const responseLabel =
    response === "yes" ? "is coming ✅" : response === "maybe" ? "marked maybe 🤔" : "can't make it ❌";

  const html = baseTemplate(`
  <div class="hero">
    <div class="logo">🪕 Hootenanny</div>
    <h1>New RSVP for ${event.title}</h1>
  </div>
  <div class="body">
    <p style="margin:0 0 20px;font-size:15px;color:#444;">
      Hey <strong>${hostName}</strong> — <strong>${guestName}</strong> ${responseLabel}${plusOnes > 0 ? ` (+ ${plusOnes} guest${plusOnes > 1 ? "s" : ""})` : ""}.
    </p>
    <div style="background:#f8f5f0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <span style="font-size:13px;color:#888;">Total RSVPs so far</span>
      <div style="font-size:32px;font-weight:700;color:#0f4c4c;margin-top:4px;">${totalRsvps}</div>
    </div>
    <a href="${eventUrl(event.id, req)}" class="cta">View event</a>
  </div>
  <div class="footer">
    You're receiving this as the host of this Hootenanny event.
  </div>`);

  try {
    await resend.client.emails.send({
      from: resend.fromEmail,
      to: hostEmail,
      subject: `${guestName} RSVPd to ${event.title}`,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send host RSVP notification:", err);
  }
}

// ── Email: item claim confirmation to claimer ─────────────────────────────────

export async function sendItemClaimConfirmation(opts: {
  toEmail: string;
  claimerName: string;
  itemName: string;
  category: string;
  event: { id: string; title: string; date: string | null; time: string | null; location: string | null };
  req: { protocol: string; hostname: string };
}) {
  const resend = await getResendClient();
  if (!resend) return;

  const { toEmail, claimerName, itemName, category, event, req } = opts;
  const dateStr = event.date ? formatDate(event.date) : null;
  const timeStr = event.time ? formatTime(event.time) : null;

  const html = baseTemplate(`
  <div class="hero">
    <div class="logo">🪕 Hootenanny</div>
    <h1>You're bringing ${itemName}!</h1>
  </div>
  <div class="body">
    <p style="margin:0 0 20px;font-size:15px;color:#444;">
      Hey <strong>${claimerName}</strong>, you've claimed an item for <strong>${event.title}</strong>.
    </p>
    <div class="detail-row"><span class="icon">🍽️</span><span class="text"><span class="label">Item</span>${itemName}</span></div>
    <div class="detail-row"><span class="icon">🏷️</span><span class="text"><span class="label">Category</span>${category}</span></div>
    ${dateStr ? `<div class="detail-row"><span class="icon">📅</span><span class="text"><span class="label">Event date</span>${dateStr}${timeStr ? ` · ${timeStr}` : ""}</span></div>` : ""}
    ${event.location ? `<div class="detail-row"><span class="icon">📍</span><span class="text"><span class="label">Location</span>${event.location}</span></div>` : ""}
    <hr class="divider" />
    <p style="margin:0 0 16px;font-size:14px;color:#666;">
      Need to change your mind? You can unclaim or swap items on the event page.
    </p>
    <a href="${eventUrl(event.id, req)}" class="cta">View event</a>
  </div>
  <div class="footer">
    You're receiving this because you claimed an item at a Hootenanny event.
  </div>`);

  try {
    await resend.client.emails.send({
      from: resend.fromEmail,
      to: toEmail,
      subject: `You're bringing ${itemName} to ${event.title}`,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send item claim confirmation:", err);
  }
}
