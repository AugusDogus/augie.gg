import type { Metadata } from "next";
import { PrototypeSwitcher } from "./_components/switcher";

export const metadata: Metadata = {
  title: "Prototypes",
  robots: { index: false, follow: false },
};

export default function PrototypesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-16">{children}</div>
      <PrototypeSwitcher />
    </>
  );
}
