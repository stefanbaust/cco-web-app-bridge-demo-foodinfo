import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { POSBridgeService } from '../pos-bridge.service';
import { ProductInfoService } from '../product-info.service';
import { Product } from '../shared/product.model';
import { NutriscoreBadgeComponent } from '../shared/nutriscore-badge';

@Component({
  selector: 'app-popup',
  imports: [CommonModule, FormsModule, NutriscoreBadgeComponent],
  templateUrl: './popup.html',
  styleUrl: './popup.css',
})
export class PopupComponent implements OnInit {
  connected = signal(false);
  product = signal<Product | null>(null);
  loading = signal(false);
  notFound = signal(false);
  barcode = '';

  readonly demoBarcodes = [
    { label: 'Nutella', code: '3017620422003' },
    { label: 'Coca-Cola', code: '5449000000996' },
    { label: 'Haribo', code: '4001686301036' },
    { label: 'Milka', code: '7622210449283' },
  ];

  private static readonly NUTRISCORE_DESCRIPTIONS: Record<string, string> = {
    a: 'Excellent nutritional quality',
    b: 'Good nutritional quality',
    c: 'Average nutritional quality',
    d: 'Poor nutritional quality',
    e: 'Bad nutritional quality',
  };

  constructor(
    private pos: POSBridgeService,
    private productInfo: ProductInfoService,
  ) {}

  ngOnInit(): void {
    this.pos.ready$.subscribe(() => {
      this.connected.set(true);
    });
  }

  lookup(barcode: string): void {
    if (!barcode.trim()) return;
    this.barcode = barcode;
    this.loading.set(true);
    this.notFound.set(false);
    this.product.set(null);

    this.productInfo.lookupBarcode(barcode.trim()).subscribe({
      next: (product) => {
        this.product.set(product);
        this.notFound.set(!product);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  onSearch(): void {
    this.lookup(this.barcode);
  }

  getNutriscoreDescription(grade: string): string {
    return PopupComponent.NUTRISCORE_DESCRIPTIONS[grade.toLowerCase()] || '';
  }

  formatAllergen(tag: string): string {
    return this.productInfo.formatAllergen(tag);
  }
}
