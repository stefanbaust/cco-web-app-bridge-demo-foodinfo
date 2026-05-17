import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { POSBridgeService } from '../pos-bridge.service';
import { ProductInfoService } from '../product-info.service';
import { Product } from '../shared/product.model';
import { NutriscoreBadgeComponent } from '../shared/nutriscore-badge';
import { BRIDGE_PREFIX } from '../shared/bridge-config';

@Component({
  selector: 'app-embedded',
  imports: [CommonModule, FormsModule, NutriscoreBadgeComponent],
  templateUrl: './embedded.html',
  styleUrl: './embedded.css',
})
export class EmbeddedComponent implements OnInit, OnDestroy {
  connected = signal(false);
  product = signal<Product | null>(null);
  loading = signal(false);
  notFound = signal(false);
  barcode = '';

  private storeSub: any;

  constructor(
    private pos: POSBridgeService,
    private productInfo: ProductInfoService,
  ) {}

  ngOnInit(): void {
    const receiptStore = this.pos.store('ReceiptStore');

    this.pos.ready$.subscribe(async () => {
      this.connected.set(true);

      const selectedItem = await receiptStore.getSelectedItem();
      this.lookup(selectedItem?.material?.gtin);
    });

    this.storeSub = receiptStore.subscribe(async () => {
      const selectedItem = await receiptStore.getSelectedItem();
      this.lookup(selectedItem?.material?.gtin);
    });
  }

  ngOnDestroy(): void {
    if (this.storeSub) {
      this.pos.store('ReceiptStore').unsubscribe();
    }
  }

  lookup(barcode: string): void {
    if (!barcode.trim()) {
      this.product.set(null);
    }
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

  openPopup(): void {
    this.pos.pushEvent(`${BRIDGE_PREFIX}_SHOW_WEBVIEW`, {});
  }

  formatAllergen(tag: string): string {
    return this.productInfo.formatAllergen(tag);
  }
}
