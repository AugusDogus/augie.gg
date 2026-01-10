import { Header } from "~/components/header";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <article>{children}</article>
    </>
  );
}
