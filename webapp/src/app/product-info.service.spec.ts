import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { ProductInfoService } from './product-info.service';
import { OpenFoodFactsResponse } from './shared/product.model';

describe('ProductInfoService', () => {
  let service: ProductInfoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductInfoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks Open Food Facts for exactly the fields the views render', () => {
    service.lookupBarcode('3017620422003').subscribe();

    const request = http.expectOne((req) => req.url.includes('/api/v2/product/3017620422003'));
    expect(request.request.url).toContain('nutriscore_grade');
    expect(request.request.url).toContain('allergens_tags');
    expect(request.request.url).toContain('nutriments');
    request.flush({ status: 0 } satisfies OpenFoodFactsResponse);
  });

  it('returns the product when Open Food Facts knows the barcode', async () => {
    const result = service.lookupBarcode('3017620422003');
    const promise = new Promise((resolve) => result.subscribe(resolve));

    http.expectOne(() => true).flush({
      status: 1,
      product: { product_name: 'Nutella', nutriscore_grade: 'e' },
    } satisfies OpenFoodFactsResponse);

    expect(await promise).toEqual({ product_name: 'Nutella', nutriscore_grade: 'e' });
  });

  it('maps an unknown barcode to null instead of an empty product', async () => {
    const promise = new Promise((resolve) => service.lookupBarcode('0000000000000').subscribe(resolve));

    http.expectOne(() => true).flush({ status: 0 } satisfies OpenFoodFactsResponse);

    expect(await promise).toBeNull();
  });

  it('turns Open Food Facts allergen tags into readable labels', () => {
    expect(service.formatAllergen('en:milk')).toBe('Milk');
    expect(service.formatAllergen('de:schalen-fruechte')).toBe('Schalen fruechte');
    expect(service.formatAllergen('gluten')).toBe('Gluten');
  });
});
