import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { POSBridgeService } from './pos-bridge.service';

/** Stands in for the POSBridge class the bridge SDK puts on window inside the POS. */
class FakePOSBridge {
  static last: FakePOSBridge;

  static localeFactory: () => Promise<string> = () => Promise.resolve('fr');

  readyResolved = Promise.resolve();
  destroyed = false;
  pushed: { type: string; data: unknown }[] = [];
  handlers = new Map<string, (payload: unknown) => void>();
  listeners = new Map<string, (data: unknown) => void>();
  removed: string[] = [];
  stores: string[] = [];

  constructor() {
    FakePOSBridge.last = this;
  }

  ready() {
    return this.readyResolved;
  }

  getLocale() {
    return FakePOSBridge.localeFactory();
  }

  destroy() {
    this.destroyed = true;
  }

  pushEvent(type: string, data: unknown) {
    this.pushed.push({ type, data });
  }

  handleEvent(type: string, callback: (payload: unknown) => void) {
    this.handlers.set(type, callback);
    return Promise.resolve();
  }

  removeEventHandler(type: string) {
    this.removed.push(type);
    return Promise.resolve();
  }

  on(event: string, callback: (data: unknown) => void) {
    this.listeners.set(event, callback);
  }

  off() {}

  store(name: string) {
    this.stores.push(name);
    return { name };
  }
}

describe('POSBridgeService', () => {
  let service: POSBridgeService;

  beforeEach(() => {
    FakePOSBridge.localeFactory = () => Promise.resolve('fr');
    (globalThis as Record<string, unknown>)['POSBridge'] = FakePOSBridge;
    TestBed.configureTestingModule({});
    service = TestBed.inject(POSBridgeService);
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['POSBridge'];
  });

  it('signals readiness and adopts the POS locale', async () => {
    const ready = new Promise<void>((resolve) => service.ready$.subscribe(() => resolve()));

    await ready;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(service.locale()).toBe('fr');
  });

  it('keeps the default locale when the POS does not answer', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    FakePOSBridge.localeFactory = () => Promise.reject(new Error('no locale'));

    const failing = new POSBridgeService(TestBed.inject(NgZone));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(failing.locale()).toBe('de');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('exposes POS stores by name', () => {
    expect(service.store('ReceiptStore')).toEqual({ name: 'ReceiptStore' });
    expect(FakePOSBridge.last.stores).toContain('ReceiptStore');
  });

  it('forwards pushed events to the bridge', () => {
    service.pushEvent('FOODINFO_SHOW_WEBVIEW', { gtin: '1' });

    expect(FakePOSBridge.last.pushed).toEqual([
      { type: 'FOODINFO_SHOW_WEBVIEW', data: { gtin: '1' } },
    ]);
  });

  it('registers one handler per event type and multicasts its payloads', async () => {
    const received: unknown[] = [];
    service.handleEvent('SALESITEM_ADD').subscribe((p) => received.push(p));
    service.handleEvent('SALESITEM_ADD').subscribe((p) => received.push(p));

    FakePOSBridge.last.handlers.get('SALESITEM_ADD')!({ gtin: '42' });

    expect(FakePOSBridge.last.handlers.size).toBe(1);
    expect(received).toEqual([{ gtin: '42' }, { gtin: '42' }]);
  });

  it('completes the stream when a handler is removed', () => {
    let completed = false;
    service.handleEvent('SALESITEM_ADD').subscribe({ complete: () => (completed = true) });

    service.removeEventHandler('SALESITEM_ADD');

    expect(completed).toBe(true);
    expect(FakePOSBridge.last.removed).toEqual(['SALESITEM_ADD']);
  });

  it('bridges bridge-level "on" events into observables', () => {
    const received: unknown[] = [];
    service.on('connected').subscribe((d) => received.push(d));

    FakePOSBridge.last.listeners.get('connected')!('yes');

    expect(received).toEqual(['yes']);
  });

  it('destroys the bridge when the service goes away', () => {
    service.ngOnDestroy();

    expect(FakePOSBridge.last.destroyed).toBe(true);
  });
});
