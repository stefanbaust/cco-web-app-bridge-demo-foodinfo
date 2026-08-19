import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { PopupComponent } from './popup';
import { POSBridgeService } from '../pos-bridge.service';
import { ProductInfoService } from '../product-info.service';
import { Product } from '../shared/product.model';

const NUTELLA: Product = { product_name: 'Nutella', nutriscore_grade: 'e' };

describe('PopupComponent', () => {
  let fixture: ComponentFixture<PopupComponent>;
  let component: PopupComponent;
  let ready: Subject<void>;
  let queryParams: BehaviorSubject<Record<string, string>>;
  let lookupBarcode: ReturnType<typeof vi.fn>;

  const createComponent = async (params: Record<string, string> = {}) => {
    ready = new Subject<void>();
    queryParams = new BehaviorSubject(params);
    lookupBarcode = vi.fn().mockReturnValue(of(NUTELLA));

    await TestBed.configureTestingModule({
      imports: [PopupComponent],
      providers: [
        { provide: POSBridgeService, useValue: { ready$: ready.asObservable(), pushEvent: vi.fn() } },
        {
          provide: ProductInfoService,
          useValue: { lookupBarcode, formatAllergen: (t: string) => t.toUpperCase() },
        },
        { provide: ActivatedRoute, useValue: { queryParams: queryParams.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.resetTestingModule());

  it('loads the deep-linked product on open', async () => {
    await createComponent({ gtin: '3017620422003' });

    expect(lookupBarcode).toHaveBeenCalledWith('3017620422003');
    expect(component.barcode).toBe('3017620422003');
    expect(component.product()).toEqual(NUTELLA);
  });

  it('waits for input when opened without a barcode', async () => {
    await createComponent();

    expect(lookupBarcode).not.toHaveBeenCalled();
    expect(component.product()).toBeNull();
  });

  it('shows the connected state once the bridge is ready', async () => {
    await createComponent();
    expect(component.connected()).toBe(false);

    ready.next();

    expect(component.connected()).toBe(true);
  });

  it('searches for the typed barcode and ignores blank input', async () => {
    await createComponent();

    component.barcode = '  ';
    component.onSearch();
    expect(lookupBarcode).not.toHaveBeenCalled();

    component.barcode = ' 5449000000996 ';
    component.onSearch();
    expect(lookupBarcode).toHaveBeenCalledWith('5449000000996');
  });

  it('reports unknown barcodes', async () => {
    await createComponent();
    lookupBarcode.mockReturnValue(of(null));

    component.lookup('0000000000000');

    expect(component.notFound()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('survives a failing lookup', async () => {
    await createComponent();
    lookupBarcode.mockReturnValue(throwError(() => new Error('offline')));

    component.lookup('3017620422003');

    expect(component.notFound()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('offers demo barcodes for a POS without a scanner', async () => {
    await createComponent();

    expect(component.demoBarcodes.map((b) => b.code)).toEqual([
      '3017620422003',
      '5449000000996',
      '4001686301036',
      '7622210449283',
    ]);
  });

  it('explains every Nutri-Score grade and stays silent for unknown ones', async () => {
    await createComponent();

    expect(component.getNutriscoreDescription('A')).toBe('Excellent nutritional quality');
    expect(component.getNutriscoreDescription('e')).toBe('Bad nutritional quality');
    expect(component.getNutriscoreDescription('z')).toBe('');
  });

  it('delegates allergen formatting to the product service', async () => {
    await createComponent();

    expect(component.formatAllergen('en:milk')).toBe('EN:MILK');
  });
});
