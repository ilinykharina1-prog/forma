import { NextResponse } from "next/server";
import { validateLead, type LeadPayload } from "@/lib/lead";

/**
 * ПРИЁМ ЗАЯВОК.
 * Заявка проверяется на сервере и уходит в Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
 * или POST-запросом на CRM_WEBHOOK_URL. Ключи задаются в переменных окружения хостинга,
 * в коде и в репозитории их нет.
 * Пока ничего не задано, возвращается 503: форма покажет ошибку, а не ложный успех.
 */

const MAX_BODY = 10_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

/** Не больше пяти заявок за десять минут с одного адреса. */
function tooMany(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sendTelegram(token: string, chatId: string, p: LeadPayload) {
  const lines = [
    "<b>Новая заявка с сайта FORMA</b>",
    "",
    `<b>Имя:</b> ${escape(p.name.trim())}`,
    `<b>Телефон:</b> ${escape(p.phone.trim())}`,
    `<b>Почта:</b> ${escape(p.email.trim())}`,
    `<b>Дом:</b> ${escape(p.house.trim())}`,
  ];
  if (p.comment?.trim()) lines.push(`<b>Комментарий:</b> ${escape(p.comment.trim())}`);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  return Boolean(response?.ok);
}

async function sendWebhook(url: string, p: LeadPayload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...p, source: "forma-site" }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  return Boolean(response?.ok);
}

export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  let body: LeadPayload & { website?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Скрытое поле видят только боты: отвечаем «успехом» и ничего не отправляем.
  if (body.website) return NextResponse.json({ ok: true });

  const payload: LeadPayload = {
    name: String(body.name ?? ""),
    phone: String(body.phone ?? ""),
    email: String(body.email ?? ""),
    house: String(body.house ?? ""),
    comment: String(body.comment ?? ""),
  };
  const errors = validateLead(payload);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "validation", fields: errors }, { status: 422 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (tooMany(ip)) return NextResponse.json({ error: "too_many" }, { status: 429 });

  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId, CRM_WEBHOOK_URL: webhook } = process.env;
  let sent: boolean;
  if (token && chatId) sent = await sendTelegram(token, chatId, payload);
  else if (webhook) sent = await sendWebhook(webhook, payload);
  else return NextResponse.json({ error: "not_configured" }, { status: 503 });

  if (!sent) return NextResponse.json({ error: "upstream" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
