import type { DueItem } from "./types";

export type Language = "en" | "bn";

export const WORKSHOP_NAME = "ServiceDue Auto Care, Dhaka";

/**
 * The dataset carries a fixed set of twelve item names, so these are the only
 * strings that need translating. Anything unrecognised falls back to English
 * rather than being mangled.
 */
const ITEM_BN: Record<string, string> = {
  "Fitness certificate": "ফিটনেস সার্টিফিকেট",
  "Battery warranty": "ব্যাটারি ওয়ারেন্টি",
  "AC service": "এসি সার্ভিসিং",
  "Air filter": "এয়ার ফিল্টার",
  Tyres: "টায়ার",
  "Tax token": "ট্যাক্স টোকেন",
  Insurance: "ইন্স্যুরেন্স",
  "Engine oil": "ইঞ্জিন অয়েল",
  "Timing belt": "টাইমিং বেল্ট",
  "Spark plugs": "স্পার্ক প্লাগ",
  Coolant: "কুল্যান্ট",
  "Brake pads": "ব্রেক প্যাড",
};

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** 9,500 → ৯,৫০০ — Bangla readers expect Bangla numerals. */
const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

const money = (n: number, lang: Language) => {
  const formatted = Math.round(n).toLocaleString("en-US");
  return lang === "bn" ? `৳${toBnDigits(formatted)}` : `Tk ${formatted}`;
};

function duePhrase(item: DueItem, lang: Language) {
  const days = Math.abs(item.daysUntil);
  if (lang === "bn") {
    const d = toBnDigits(String(days));
    if (item.status === "overdue") {
      return days === 0 ? "আজই বাকি" : `${d} দিন পার হয়েছে`;
    }
    return days === 0 ? "আজই দরকার" : `আর ${d} দিন বাকি`;
  }
  if (item.status === "overdue") {
    return days === 0 ? "due today" : `${days} days overdue`;
  }
  return days === 0 ? "due today" : `due in ${days} days`;
}

/**
 * A reminder the front desk can send as-is. Every figure comes from the
 * vehicle's own due items — nothing here is a generic template value.
 */
export function reminderMessage(input: {
  ownerName: string;
  model: string;
  plate: string;
  items: DueItem[];
  lang: Language;
}): string {
  const { ownerName, model, plate, items, lang } = input;
  const total = items.reduce((n, i) => n + i.cost, 0);

  if (lang === "bn") {
    const lines = items.map(
      (i) =>
        `• ${ITEM_BN[i.itemName] ?? i.itemName} — ${duePhrase(i, "bn")} — ${money(i.cost, "bn")}`
    );
    return [
      `আসসালামু আলাইকুম ${ownerName},`,
      "",
      `আমরা ${WORKSHOP_NAME} থেকে বলছি। আপনার ${model} (${plate}) গাড়ির নিচের কাজগুলো এখন বাকি আছে:`,
      "",
      ...lines,
      "",
      `আনুমানিক মোট খরচ: ${money(total, "bn")}`,
      "",
      "সুবিধাজনক সময় জানালে আমরা সিরিয়াল রেখে দেব। ধন্যবাদ।",
    ].join("\n");
  }

  const lines = items.map(
    (i) => `• ${i.itemName} — ${duePhrase(i, "en")} — ${money(i.cost, "en")}`
  );
  return [
    `Assalamu alaikum ${ownerName},`,
    "",
    `This is ${WORKSHOP_NAME}. The following work is now due on your ${model} (${plate}):`,
    "",
    ...lines,
    "",
    `Estimated total: ${money(total, "en")}`,
    "",
    "Let us know a time that suits you and we will hold a slot. Thank you.",
  ].join("\n");
}

/**
 * Bangladeshi mobile numbers are stored as 01XXXXXXXXX; WhatsApp needs the
 * country code and no leading zero.
 */
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("880")
    ? digits
    : `880${digits.replace(/^0/, "")}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
