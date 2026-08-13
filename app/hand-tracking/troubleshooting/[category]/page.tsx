import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { flatSteps } from "../../data";
import { findCategory } from "../prototype-data";
import { VariantA } from "../variants/VariantA";
import { VariantB } from "../variants/VariantB";
import { VariantC } from "../variants/VariantC";
import { PrototypeSwitcher } from "../../components/PrototypeSwitcher";

// PROTOTYPE — ticket 09 (.scratch/hand-tracking-deploy/issues/09-prototype-troubleshooting-pages.md).
// Lives entirely outside the node-chain per ticket 07 decision #2/#7:
// no LockGuard, no localStorage progress read/write, and ChainRail
// self-hides on this route (see components/ChainRail.tsx).

export default async function TroubleshootingCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ variant?: string; from?: string }>;
}) {
  const { category: categorySlug } = await params;
  const { variant = "A", from } = await searchParams;

  const category = findCategory(categorySlug);
  if (!category) notFound();

  const fromStep = from ? flatSteps.find((fs) => fs.step.id === from) : null;
  const backHref = fromStep ? `/hand-tracking/${fromStep.step.id}?variant=${variant}` : `/hand-tracking?variant=${variant}`;
  const backLabel = fromStep ? `Back to Step: ${fromStep.step.title}` : "Back to the guide";

  return (
    <div className="ht-wrap">
      <div className="htp-page">
        <Link href={backHref} className="htp-back">
          ← {backLabel}
        </Link>

        <div className="htp-exit-badge">You've left the main flow — this page isn't a step</div>
        <h1 className="htp-title">{category.title}</h1>
        <p className="htp-tagline">{category.tagline}</p>

        {variant === "B" && <VariantB category={category} />}
        {variant === "C" && <VariantC category={category} />}
        {variant !== "B" && variant !== "C" && <VariantA category={category} />}
      </div>

      <Suspense fallback={null}>
        <PrototypeSwitcher />
      </Suspense>
    </div>
  );
}
