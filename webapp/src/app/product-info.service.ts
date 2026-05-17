import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { OpenFoodFactsResponse, Product } from './shared/product.model';

@Injectable({ providedIn: 'root' })
export class ProductInfoService {
  private readonly baseUrl = 'https://world.openfoodfacts.org/api/v2/product';
  private readonly fields = [
    'product_name',
    'brands',
    'image_url',
    'nutriscore_grade',
    'allergens_tags',
    'ingredients_text',
    'nutriments',
    'categories',
    'quantity',
  ].join(',');

  constructor(private http: HttpClient) {}

  lookupBarcode(barcode: string): Observable<Product | null> {
    const url = `${this.baseUrl}/${barcode}?fields=${this.fields}`;
    return this.http
      .get<OpenFoodFactsResponse>(url)
      .pipe(map((res) => (res.status === 1 && res.product ? res.product : null)));
  }

  formatAllergen(tag: string): string {
    const parts = tag.split(':');
    const name = parts.length > 1 ? parts[1] : parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
  }
}
