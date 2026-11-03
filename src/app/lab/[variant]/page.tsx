import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Home } from "~/components/home";
import { CardsWork } from "~/components/work/prototypes/cards";
import { RailWork } from "~/components/work/prototypes/rail";
import { StageWork } from "~/components/work/prototypes/stage";

/** Selected work prototypes on the real home page; never served in production. */
const variants: Readonly<
  Record<string, { name: string; work: () => ReactNode }>
> = {
  stage: { name: "Stage", work: () => <StageWork /> },
  cards: { name: "Cards", work: () => <CardsWork /> },
  rail: { name: "Rail", work: () => <RailWork /> },
};

type Props = { params: Promise<{ variant: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(variants).map((variant) => ({ variant }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { variant } = await params;
  return {
    title: `${variants[variant]?.name ?? "Lab"} prototype`,
    robots: { index: false, follow: false },
  };
}

export default async function LabVariant({ params }: Props) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const { variant } = await params;
  const prototype = variants[variant];
  if (prototype === undefined) notFound();
  return <Home work={prototype.work()} />;
}
