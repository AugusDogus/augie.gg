"use client";
import { PrinterIcon } from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
export function PrintResume({ className }: { className?: string }) {
  return (
    <Button
      variant="secondary"
      className={className}
      onClick={() => window.print()}
    >
      <PrinterIcon aria-hidden="true" />
      Print résumé
    </Button>
  );
}
