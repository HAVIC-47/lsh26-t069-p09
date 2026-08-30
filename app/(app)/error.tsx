"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
      <TriangleAlert
        className="mx-auto mb-3 h-6 w-6 text-overdue"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h1 className="font-semibold">Could not load the workshop data</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {error.message || "Something went wrong reading the service records."} Check
        that the Supabase schema has been applied and seeded.
      </p>
      <Button variant="primary" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
