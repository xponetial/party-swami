export type ShoppingItemRecord = {
  id: string;
  shoppingListId: string;
  category: string;
  name: string;
  quantity: number;
  estimatedPrice: number | null;
  status: string;
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
