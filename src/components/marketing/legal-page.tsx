import { ShellFrame } from "@/components/layout/shell-frame";
import { Card } from "@/components/ui/card";

type LegalSection = {
  title: string;
  body: string[];
};

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <ShellFrame eyebrow="Legal" title={title} description={intro}>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-[rgba(244,247,255,0.9)]">
          <h2 className="text-xl font-semibold text-ink">What this covers</h2>
          <div className="mt-5 grid gap-3">
            {sections.map((section) => (
              <div key={section.title} className="rounded-3xl border border-border bg-white/85 px-4 py-4">
                <p className="text-sm font-semibold text-ink">{section.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {section.body[0]}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="max-w-4xl bg-white/80">
          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-ink-muted">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </Card>
      </div>
    </ShellFrame>
  );
}
