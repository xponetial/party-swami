export type GeneratedPartyPlan = {
  theme: string;
  invite_copy: string;
  menu: string[];
  shopping_categories: Array<{
    category: string;
    items: Array<{
      name: string;
      quantity: number;
    }>;
  }>;
  tasks: Array<{
    title: string;
    due_label: string;
  }>;
  timeline: Array<{
    label: string;
    detail: string;
  }>;
};
