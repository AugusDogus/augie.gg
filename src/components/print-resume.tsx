"use client";
import { FileTextIcon } from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
export function PrintResume() {
  return (
    <Button onClick={() => window.print()}>
      <FileTextIcon aria-hidden="true" />
      Print résumé
    </Button>
  );
}
