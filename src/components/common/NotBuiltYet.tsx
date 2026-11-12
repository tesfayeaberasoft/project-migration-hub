import { Construction } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { EmptyState } from "./States";

/** Temporary page for screens that are planned but not built yet. */
export function NotBuiltYet({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <EmptyState icon={<Construction className="h-5 w-5" />} title="This page is not built yet" description="It is planned and will be added in the next update." />
    </>
  );
}
