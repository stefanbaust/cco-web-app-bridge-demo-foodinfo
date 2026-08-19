import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { EmbeddedComponent } from './embedded';
import { POSBridgeService } from '../pos-bridge.service';
import { ProductInfoService } from '../product-info.service';
import { Product } from '../shared/product.model';

const NUTELLA: Product = { product_name: 'Nutella', nutriscore_grade: 'e', allergens_tags: ['en:milk'] };

describe('EmbeddedComponent', () => {
  let fixture: ComponentFixture<EmbeddedComponent>;
  let component: EmbeddedComponent;
  let selectedItem: unknown;
  let storeCallback: () => void;
  let ready: Subject<void>;
  let pushEvent: ReturnType<typeof vi.fn>;
  let lookupBarcode: ReturnType<typeof vi.fn>;
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    selectedItem = { material: { gtin: '3017620422003' } };
    ready = new Subject<void>();
    pushEvent = vi.fn();
    unsubscribe = vi.fn();
    lookupBarcode = vi.fn().mockReturnValue(of(NUTELLA));

    const receiptStore = {
      getSelectedItem: () => Promise.resolve(selectedItem),
      subscribe: (cb: () => void) => {
        storeCallback = cb;
        return 'subscription';
      },
      unsubscribe,
    };

    await TestBed.configureTestingModule({
      imports: [EmbeddedComponent],
      providers: [
        {
          provide: POSBridgeService,
          useValue: { ready$: ready.asObservable(), store: () => receiptStore, pushEvent },
        },
        {
          provide: ProductInfoService,
          useValue: { lookupBarcode, formatAllergen: (t: string) => t.toUpperCase() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmbeddedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('looks up the GTIN of the selected receipt item once the bridge is ready', async () => {
    ready.next();
    await flush();

    expect(component.connected()).toBe(true);
    expect(component.barcode()).toBe('3017620422003');
    expect(lookupBarcode).toHaveBeenCalledWith('3017620422003');
    expect(component.product()).toEqual(NUTELLA);
    expect(component.loading()).toBe(false);
  });

  it('follows the receipt selection when the cashier books another article', async () => {
    selectedItem = { material: { gtin: '5449000000996' } };

    storeCallback();
    await flush();

    expect(component.barcode()).toBe('5449000000996');
    expect(lookupBarcode).toHaveBeenCalledWith('5449000000996');
  });

  it('clears the card for items without a GTIN', async () => {
    selectedItem = { material: {} };

    storeCallback();
    await flush();

    expect(component.barcode()).toBeNull();
    expect(component.product()).toBeNull();
    expect(lookupBarcode).not.toHaveBeenCalled();
  });

  it('reports products Open Food Facts does not know', () => {
    lookupBarcode.mockReturnValue(of(null));

    component.lookup('0000000000000');

    expect(component.notFound()).toBe(true);
    expect(component.product()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('survives a failing lookup', () => {
    lookupBarcode.mockReturnValue(throwError(() => new Error('offline')));

    component.lookup('3017620422003');

    expect(component.notFound()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('searches for the barcode currently shown', () => {
    component.barcode.set('4001686301036');

    component.onSearch();

    expect(lookupBarcode).toHaveBeenCalledWith('4001686301036');
  });

  it('asks the POS to open the popup for the current barcode', () => {
    component.barcode.set('3017620422003');

    component.openPopup();

    expect(pushEvent).toHaveBeenCalledWith('FOODINFO_SHOW_WEBVIEW', { gtin: '3017620422003' });
  });

  it('delegates allergen formatting to the product service', () => {
    expect(component.formatAllergen('en:milk')).toBe('EN:MILK');
  });

  it('unsubscribes from the receipt store when it is removed from the screen', () => {
    fixture.destroy();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
