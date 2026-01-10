import { Header } from "~/components/header";

export default function BlogLayout({
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
