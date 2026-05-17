export interface Nutriments {
  energy_kcal_100g?: number;
  fat_100g?: number;
  sugars_100g?: number;
  proteins_100g?: number;
  salt_100g?: number;
}

export interface Product {
  product_name?: string;
  brands?: string;
  image_url?: string;
  nutriscore_grade?: string;
  allergens_tags?: string[];
  ingredients_text?: string;
  nutriments?: Nutriments;
  categories?: string;
  quantity?: string;
}

export interface OpenFoodFactsResponse {
  status: number;
  product?: Product;
  code?: string;
}
