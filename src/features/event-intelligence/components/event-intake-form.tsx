"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TurnstileGate, type TurnstileGateHandle } from "@/components/security/turnstile-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventAnswerValue, EventQuestionSection } from "@/features/event-intelligence/types";
import { shouldDisplayQuestion } from "@/features/event-intelligence/services/event-intelligence";

type Props = {
  eventId: string;
  sections: EventQuestionSection[];
  initialAnswers: Record<string, EventAnswerValue>;
};

function readOptions(metadata: Record<string, unknown>) {
  const raw = metadata.options;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

function MultiSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option);
        return (
          <button
            key={option}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active ? "border-brand bg-brand/10 text-brand" : "border-border bg-white text-ink-muted"
            }`}
            onClick={() => {
              if (active) {
                onChange(value.filter((item) => item !== option));
              } else {
                onChange([...value, option]);
              }
            }}
            type="button"
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function EventIntakeForm({ eventId, sections, initialAnswers }: Props) {
  const [answers, setAnswers] = useState<Record<string, EventAnswerValue>>(initialAnswers);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [flowStep, setFlowStep] = useState<"idle" | "saving" | "planning" | "complete">("idle");
  const [showValidation, setShowValidation] = useState(false);
  const turnstileRef = useRef<TurnstileGateHandle>(null);
  const completedRef = useRef(false);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const visibleSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        questions: section.questions.filter((question) => shouldDisplayQuestion(question, answers)),
      })),
    [answers, sections],
  );

  const visibleQuestionsCount = visibleSections.reduce((sum, section) => sum + section.questions.length, 0);
  const answeredCount = Object.values(answers).filter((value) => {
    if (value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  }).length;

  const completionPct = visibleQuestionsCount ? Math.round((answeredCount / visibleQuestionsCount) * 100) : 0;

  const setAnswer = (key: string, value: EventAnswerValue) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const missingRequiredLabels = useMemo(() => {
    const missing: string[] = [];
    for (const section of visibleSections) {
      for (const question of section.questions) {
        if (!question.required) continue;
        const value = answers[question.questionKey];
        const isEmpty =
          value == null ||
          (typeof value === "string" && value.trim().length === 0) ||
          (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          missing.push(question.label);
        }
      }
    }
    return missing;
  }, [answers, visibleSections]);

  const missingRequiredKeys = useMemo(() => {
    const missing = new Set<string>();
    for (const section of visibleSections) {
      for (const question of section.questions) {
        if (!question.required) continue;
        const value = answers[question.questionKey];
        const isEmpty =
          value == null ||
          (typeof value === "string" && value.trim().length === 0) ||
          (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          missing.add(question.questionKey);
        }
      }
    }
    return missing;
  }, [answers, visibleSections]);

  async function saveAnswers() {
    const payload = Object.entries(answers).map(([questionKey, answer]) => ({ questionKey, answer }));
    if (!payload.length) return true;

    if (missingRequiredLabels.length) {
      setShowValidation(true);
      setStatus(`Please complete required fields: ${missingRequiredLabels.slice(0, 3).join(", ")}${missingRequiredLabels.length > 3 ? "..." : ""}`);
      const firstMissingKey = [...missingRequiredKeys][0];
      if (firstMissingKey) {
        fieldRefs.current[firstMissingKey]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }
    setShowValidation(false);

    const completedSections = visibleSections
      .filter((section) =>
        section.questions.every((question) => {
          if (!question.required) return true;
          const value = answers[question.questionKey];
          return (
            value != null &&
            !(typeof value === "string" && value.trim().length === 0) &&
            !(Array.isArray(value) && value.length === 0)
          );
        }),
      )
      .map((section) => section.sectionName);

    const response = await fetch(`/api/events/${eventId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload, completedSections }),
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!response.ok || !data?.ok) {
      setStatus(data?.message ?? "Unable to save right now.");
      return false;
    }
    setStatus("Saved");
    return true;
  }

  async function handleOneClickPlan() {
    if (pending) return;
    setPending(true);
    setStatus(null);
    setFlowStep("saving");

    try {
      const saved = await saveAnswers();
      if (!saved) {
        setFlowStep("idle");
        return;
      }

      setFlowStep("planning");
      const turnstileToken = await turnstileRef.current?.getToken();

      if (!turnstileToken) {
        setStatus("Bot protection could not verify this request. Please try again.");
        setFlowStep("idle");
        return;
      }

      const response = await fetch("/api/ai/one-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, turnstileToken }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !data?.ok) {
        setStatus(data?.message ?? "Unable to run One-Click AI Plan right now.");
        setFlowStep("idle");
        return;
      }

      setFlowStep("complete");
      setStatus("Complete. Moving to invite...");
      completedRef.current = true;
      await fetch(`/api/events/${eventId}/intake-lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "completed", metadata: { completion_pct: completionPct } }),
      }).catch(() => null);
      window.location.assign(`/events/${eventId}/invite`);
    } finally {
      setPending(false);
    }
  }

  const progressValue = flowStep === "saving" ? 33 : flowStep === "planning" ? 72 : flowStep === "complete" ? 100 : 0;
  const progressLabel = flowStep === "saving" ? "Saving" : flowStep === "planning" ? "Planning" : flowStep === "complete" ? "Complete" : "Ready";

  useEffect(() => {
    fetch(`/api/events/${eventId}/intake-lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "started" }),
    }).catch(() => null);
  }, [eventId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (completedRef.current) return;
      const payload = JSON.stringify({
        action: "abandoned",
        metadata: { completion_pct: completionPct },
      });
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(`/api/events/${eventId}/intake-lifecycle`, blob);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [completionPct, eventId]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Event intelligence</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Enhanced party questions</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Answer what matters and Party Swami will tailor AI planning, vendors, and shopping.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-canvas px-4 py-2 text-sm text-ink-muted">
            {completionPct}% complete
          </div>
        </div>
      </Card>

      {visibleSections.map((section) => (
        <Card key={section.id}>
          <h3 className="text-lg font-semibold text-ink">{section.sectionName}</h3>
          <div className="mt-4 grid gap-4">
            {section.questions.map((question) => {
              const value = answers[question.questionKey];
              const options = readOptions(question.metadata);
              return (
                <div key={question.id} className="space-y-2">
                  <div ref={(node) => { fieldRefs.current[question.questionKey] = node; }} />
                  <Label htmlFor={question.questionKey}>{question.label}</Label>
                  {showValidation && missingRequiredKeys.has(question.questionKey) ? (
                    <p className="text-xs text-brand">This required field is needed to continue.</p>
                  ) : null}
                  {question.questionType === "boolean" ? (
                    <div className={`flex gap-2 rounded-xl p-1 ${showValidation && missingRequiredKeys.has(question.questionKey) ? "ring-1 ring-brand/60" : ""}`}>
                      <Button
                        type="button"
                        variant={value === true ? "primary" : "secondary"}
                        onClick={() => setAnswer(question.questionKey, true)}
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant={value === false ? "primary" : "secondary"}
                        onClick={() => setAnswer(question.questionKey, false)}
                      >
                        No
                      </Button>
                    </div>
                  ) : null}
                  {question.questionType === "number" ? (
                    <Input
                      id={question.questionKey}
                      type="number"
                      className={showValidation && missingRequiredKeys.has(question.questionKey) ? "border-brand focus-visible:ring-brand" : ""}
                      value={typeof value === "number" ? String(value) : ""}
                      placeholder={question.placeholder ?? ""}
                      onChange={(event) =>
                        setAnswer(
                          question.questionKey,
                          event.target.value.trim().length ? Number(event.target.value) : null,
                        )
                      }
                    />
                  ) : null}
                  {question.questionType === "text" ? (
                    <Input
                      id={question.questionKey}
                      type="text"
                      className={showValidation && missingRequiredKeys.has(question.questionKey) ? "border-brand focus-visible:ring-brand" : ""}
                      value={typeof value === "string" ? value : ""}
                      placeholder={question.placeholder ?? ""}
                      onChange={(event) => setAnswer(question.questionKey, event.target.value)}
                    />
                  ) : null}
                  {question.questionType === "single_select" ? (
                    <select
                      id={question.questionKey}
                      className={`h-11 w-full rounded-xl border bg-white px-3 text-sm ${
                        showValidation && missingRequiredKeys.has(question.questionKey)
                          ? "border-brand ring-1 ring-brand/40"
                          : "border-border"
                      }`}
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) => setAnswer(question.questionKey, event.target.value || null)}
                    >
                      <option value="">Select one</option>
                      {options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {question.questionType === "multi_select" ? (
                    <div className={`${showValidation && missingRequiredKeys.has(question.questionKey) ? "rounded-xl p-1 ring-1 ring-brand/60" : ""}`}>
                      <MultiSelect
                        options={options}
                        value={Array.isArray(value) ? (value as string[]) : []}
                        onChange={(next) => setAnswer(question.questionKey, next)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <div className="sticky bottom-3 z-20">
        <Card className="space-y-3 border-brand/20 bg-white/95">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">{status ?? "One-click will save answers, plan everything, and open invite."}</p>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">{progressLabel}</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleOneClickPlan} disabled={pending} variant="primary">
              {pending ? "Working..." : "One-Click AI Plan"}
            </Button>
          </div>
          <TurnstileGate ref={turnstileRef} />
        </Card>
      </div>
    </div>
  );
}
