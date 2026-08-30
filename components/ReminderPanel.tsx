"use client";

import { useState } from "react";
import { Check, Copy, MessageSquare, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Both language variants are rendered on the server and passed in as strings,
 * so the message logic and the item-name dictionary never ship to the browser.
 */
export function ReminderPanel({
  messageEn,
  messageBn,
  waEn,
  waBn,
  ownerName,
}: {
  messageEn: string;
  messageBn: string;
  waEn: string;
  waBn: string;
  ownerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "bn">("en");
  const [copied, setCopied] = useState(false);

  const message = lang === "en" ? messageEn : messageBn;
  const wa = lang === "en" ? waEn : waBn;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard is blocked in some embedded contexts; the textarea below is
      // selectable, so the user can still copy by hand.
      setCopied(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} aria-expanded={false}>
        <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        Reminder
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted">
          Reminder for {ownerName}
        </span>
        <div className="ml-auto flex gap-1.5">
          <Button
            size="sm"
            variant={lang === "en" ? "primary" : "secondary"}
            onClick={() => setLang("en")}
          >
            English
          </Button>
          <Button
            size="sm"
            variant={lang === "bn" ? "primary" : "secondary"}
            onClick={() => setLang("bn")}
          >
            বাংলা
          </Button>
        </div>
      </div>

      <label className="sr-only" htmlFor="reminder-text">
        Reminder message
      </label>
      <textarea
        id="reminder-text"
        readOnly
        value={message}
        rows={9}
        className="w-full resize-y rounded-lg border border-border bg-surface p-2.5 text-xs leading-relaxed"
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-fine" strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-accent bg-accent px-2.5 text-xs font-medium whitespace-nowrap text-[#3b2a05] transition-colors duration-200 hover:opacity-90"
        >
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          Open in WhatsApp
        </a>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </div>
  );
}
