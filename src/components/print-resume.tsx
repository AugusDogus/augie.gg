"use client";
import { PrinterIcon } from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
export function PrintResume() {
  return (
    <Button onClick={() => window.print()}>
      <PrinterIcon aria-hidden="true" />
      Print résumé
    </Button>
  );
}
