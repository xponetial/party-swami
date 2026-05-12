import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EventAnswerRecord,
  EventAnswerValue,
  EventIntelligenceContext,
  EventQuestion,
  EventQuestionSection,
} from "@/features/event-intelligence/types";

type QuestionSetRow = {
  id: string;
  event_type: string;
  section_name: string;
  display_order: number;
};

type QuestionRow = {
  id: string;
  question_set_id: string;
  question_key: string;
  label: string;
  description: string | null;
  question_type: EventQuestion["questionType"];
  placeholder: string | null;
  required: boolean;
  conditional_parent: string | null;
  conditional_value: string | null;
  display_order: number;
  metadata: Record<string, unknown> | null;
};

type AnswerRow = {
  question_key: string;
  answer: EventAnswerValue;
};

function eventTypeSlug(value: string) {
  return value.trim().toLowerCase().replaceAll(" ", "-");
}

function asBoolean(value: EventAnswerValue) {
  return value === true || value === "true";
}

function asNumber(value: EventAnswerValue) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: EventAnswerValue) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asStringArray(value: EventAnswerValue) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function shouldDisplayQuestion(
  question: Pick<EventQuestion, "conditionalParent" | "conditionalValue">,
  answersByKey: Record<string, EventAnswerValue>,
) {
  if (!question.conditionalParent || question.conditionalValue == null) {
    return true;
  }

  const parentAnswer = answersByKey[question.conditionalParent];
  if (Array.isArray(parentAnswer)) {
    return parentAnswer.map((item) => item.toLowerCase()).includes(question.conditionalValue.toLowerCase());
  }

  const normalizedParent = typeof parentAnswer === "string" ? parentAnswer.toLowerCase() : String(parentAnswer);
  return normalizedParent === question.conditionalValue.toLowerCase();
}

export async function loadEventQuestionSections(
  supabase: SupabaseClient,
  eventType: string,
): Promise<EventQuestionSection[]> {
  const slug = eventTypeSlug(eventType);
  const { data: questionSets, error: setsError } = await supabase
    .from("event_question_sets")
    .select("id, event_type, section_name, display_order")
    .in("event_type", ["universal", slug])
    .order("display_order", { ascending: true })
    .returns<QuestionSetRow[]>();

  if (setsError) {
    throw new Error(setsError.message);
  }

  if (!questionSets?.length) {
    return [];
  }

  const setIds = questionSets.map((set) => set.id);
  const { data: questions, error: questionsError } = await supabase
    .from("event_questions")
    .select(
      "id, question_set_id, question_key, label, description, question_type, placeholder, required, conditional_parent, conditional_value, display_order, metadata",
    )
    .in("question_set_id", setIds)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .returns<QuestionRow[]>();

  if (questionsError) {
    throw new Error(questionsError.message);
  }

  const questionsBySet = new Map<string, EventQuestion[]>();
  for (const row of questions ?? []) {
    const list = questionsBySet.get(row.question_set_id) ?? [];
    list.push({
      id: row.id,
      questionKey: row.question_key,
      label: row.label,
      description: row.description,
      questionType: row.question_type,
      placeholder: row.placeholder,
      required: row.required,
      conditionalParent: row.conditional_parent,
      conditionalValue: row.conditional_value,
      displayOrder: row.display_order,
      metadata: row.metadata ?? {},
    });
    questionsBySet.set(row.question_set_id, list);
  }

  return questionSets.map((set) => ({
    id: set.id,
    eventType: set.event_type,
    sectionName: set.section_name,
    displayOrder: set.display_order,
    questions: questionsBySet.get(set.id) ?? [],
  }));
}

export async function upsertEventAnswers(
  supabase: SupabaseClient,
  eventId: string,
  answers: EventAnswerRecord[],
) {
  if (!answers.length) return;
  const payload = answers.map((item) => ({
    event_id: eventId,
    question_key: item.questionKey,
    answer: item.answer,
  }));

  const { error } = await supabase
    .from("event_answers")
    .upsert(payload, {
      onConflict: "event_id,question_key",
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadEventAnswers(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase
    .from("event_answers")
    .select("question_key, answer")
    .eq("event_id", eventId)
    .returns<AnswerRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function buildEventIntelligenceContext({
  eventType,
  guestTarget,
  answers,
}: {
  eventType: string;
  guestTarget: number | null;
  answers: AnswerRow[];
}): EventIntelligenceContext {
  const rawAnswers: Record<string, EventAnswerValue> = {};
  for (const answer of answers) {
    rawAnswers[answer.question_key] = answer.answer;
  }

  return {
    eventType,
    guestCount: guestTarget,
    childrenAttending: asBoolean(rawAnswers.children_attending ?? null),
    alcoholServed: asBoolean(rawAnswers.alcohol_served ?? null),
    venue: {
      indoorOutdoor: asString(rawAnswers.venue_indoor_outdoor ?? null),
      venueType: asString(rawAnswers.venue_type ?? null),
      formalityLevel: asString(rawAnswers.formality_level ?? null),
    },
    food: {
      served: asBoolean(rawAnswers.food_served ?? null),
      cateringNeeded: asBoolean(rawAnswers.catering_needed ?? null),
      serviceStyle: asString(rawAnswers.food_service_style ?? null),
      cuisinePreferences: asStringArray(rawAnswers.cuisine_preferences ?? null),
      dietaryRestrictions: asStringArray(rawAnswers.dietary_restrictions ?? null),
    },
    bar: {
      openBar: asBoolean(rawAnswers.open_bar ?? null),
      byob: asBoolean(rawAnswers.byob ?? null),
      bartenderNeeded: asBoolean(rawAnswers.bartender_needed ?? null),
      signatureDrinks: asBoolean(rawAnswers.signature_drinks ?? null),
      estimatedDrinkers: asNumber(rawAnswers.estimated_drinkers ?? null),
    },
    servicesRequested: asStringArray(rawAnswers.services_requested ?? null),
    aiHelpRequested: asStringArray(rawAnswers.ai_help_requested ?? null),
    rawAnswers,
  };
}
