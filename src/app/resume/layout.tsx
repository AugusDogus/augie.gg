import { Header } from "~/components/header";

export default function ResumeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <article className="space-y-4">{children}</article>
    </>
  );
}
