export type EventQuestionType =
  | "boolean"
  | "text"
  | "number"
  | "single_select"
  | "multi_select"
  | "date"
  | "time";

export type EventQuestion = {
  id: string;
  questionKey: string;
  label: string;
  description: string | null;
  questionType: EventQuestionType;
  placeholder: string | null;
  required: boolean;
  conditionalParent: string | null;
  conditionalValue: string | null;
  displayOrder: number;
  metadata: Record<string, unknown>;
};

export type EventQuestionSection = {
  id: string;
  eventType: string;
  sectionName: string;
  displayOrder: number;
  questions: EventQuestion[];
};

export type EventAnswerValue = boolean | number | string | string[] | null;

export type EventAnswerRecord = {
  questionKey: string;
  answer: EventAnswerValue;
};

export type EventIntelligenceContext = {
  eventType: string;
  guestCount: number | null;
  childrenAttending: boolean;
  alcoholServed: boolean;
  venue: {
    indoorOutdoor: string | null;
    venueType: string | null;
    formalityLevel: string | null;
  };
  food: {
    served: boolean;
    cateringNeeded: boolean;
    serviceStyle: string | null;
    cuisinePreferences: string[];
    dietaryRestrictions: string[];
  };
  bar: {
    openBar: boolean;
    byob: boolean;
    bartenderNeeded: boolean;
    signatureDrinks: boolean;
    estimatedDrinkers: number | null;
  };
  servicesRequested: string[];
  aiHelpRequested: string[];
  rawAnswers: Record<string, EventAnswerValue>;
};
