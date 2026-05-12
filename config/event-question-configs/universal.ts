export const universalQuestionConfig = {
  sections: [
    {
      key: "venue_setup",
      title: "Venue and setup",
      questionKeys: [
        "venue_indoor_outdoor",
        "venue_type",
        "event_duration_hours",
        "formality_level",
      ],
    },
    {
      key: "guest_intelligence",
      title: "Guest intelligence",
      questionKeys: [
        "primary_age_group",
        "children_attending",
        "children_count",
        "children_age_ranges",
        "accessibility_requirements",
      ],
    },
  ],
} as const;
