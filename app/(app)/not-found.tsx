import { CarFront } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
      <CarFront
        className="mx-auto mb-3 h-6 w-6 text-muted"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h1 className="font-semibold">Vehicle not found</h1>
      <p className="mt-2 text-sm text-muted">
        No vehicle on the register matches that reference.
      </p>
      <ButtonLink href="/vehicles" variant="primary" className="mt-4">
        Back to vehicles
      </ButtonLink>
    </div>
  );
}
