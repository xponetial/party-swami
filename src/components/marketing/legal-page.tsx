import { ShellFrame } from "@/components/layout/shell-frame";
import { Card } from "@/components/ui/card";

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: string[];
}) {
  return (
    <ShellFrame eyebrow="Legal" title={title} description={intro}>
      <Card className="max-w-4xl bg-white/80">
        <div className="space-y-4">
          {sections.map((section) => (
            <p key={section} className="text-sm leading-7 text-ink-muted">
              {section}
            </p>
          ))}
        </div>
      </Card>
    </ShellFrame>
  );
}
