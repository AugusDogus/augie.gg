import { Header } from "~/components/header";
import { BlogArticle } from "~/components/blog-article";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <BlogArticle>{children}</BlogArticle>
    </>
  );
}
