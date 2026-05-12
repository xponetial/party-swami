import { z } from "zod";

export const questionTypeSchema = z.enum([
  "boolean",
  "text",
  "number",
  "single_select",
  "multi_select",
  "date",
  "time",
]);

export const questionSchema = z.object({
  id: z.string().uuid(),
  questionKey: z.string().trim().min(2),
  label: z.string().trim().min(2),
  description: z.string().nullable(),
  questionType: questionTypeSchema,
  placeholder: z.string().nullable(),
  required: z.boolean(),
  conditionalParent: z.string().nullable(),
  conditionalValue: z.string().nullable(),
  displayOrder: z.number().int(),
  metadata: z.record(z.string(), z.unknown()),
});

export const questionSectionSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string().trim().min(2),
  sectionName: z.string().trim().min(2),
  displayOrder: z.number().int(),
  questions: z.array(questionSchema),
});

export const saveAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionKey: z.string().trim().min(2),
        answer: z.union([z.boolean(), z.number(), z.string(), z.array(z.string()), z.null()]),
      }),
    )
    .min(1, "At least one answer is required."),
  completedSections: z.array(z.string().trim().min(1)).optional(),
});
