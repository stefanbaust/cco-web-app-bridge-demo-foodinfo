import { Injectable, NgZone, OnDestroy, signal } from '@angular/core';
import { Observable, Subject, ReplaySubject } from 'rxjs';

declare class POSBridge {
  constructor(options?: { targetOrigin?: string; timeout?: number });
  ready(): Promise<void>;
  destroy(): void;
  getLocale(): Promise<string>;
  pushEvent(eventType: string, eventData: any): void;
  handleEvent(
    eventType: string,
    callback: (payload: any) => void,
    options?: { consume?: boolean },
  ): Promise<any>;
  removeEventHandler(eventType: string): Promise<any>;
  store(storeName: string): any;
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
}

@Injectable({ providedIn: 'root' })
export class POSBridgeService implements OnDestroy {
  private bridge: POSBridge;
  private readySubject = new ReplaySubject<void>(1);
  private eventSubjects = new Map<string, Subject<any>>();

  readonly locale = signal('de');
  ready$ = this.readySubject.asObservable();

  constructor(private zone: NgZone) {
    this.bridge = new POSBridge();
    this.bridge.ready().then(() => {
      this.zone.run(() => this.readySubject.next());
      this.bridge
        .getLocale()
        .then((locale) => {
          this.zone.run(() => this.locale.set(locale));
        })
        .catch((e) => {
          console.warn('[POSBridgeService] Could not fetch locale, using default:', e);
        });
    });
  }

  ngOnDestroy(): void {
    this.bridge.destroy();
    this.eventSubjects.forEach((s) => s.complete());
  }

  store(storeName: string): any {
    return this.bridge.store(storeName);
  }

  async getLocale(): Promise<string> {
    return this.bridge.getLocale();
  }

  pushEvent(eventType: string, eventData: any): void {
    this.bridge.pushEvent(eventType, eventData);
  }

  handleEvent(eventType: string, options?: { consume?: boolean }): Observable<any> {
    const key = 'bus:' + eventType;
    if (!this.eventSubjects.has(key)) {
      const subject = new Subject<any>();
      this.eventSubjects.set(key, subject);
      this.bridge.handleEvent(
        eventType,
        (payload: any) => {
          this.zone.run(() => subject.next(payload));
        },
        options,
      );
    }
    return this.eventSubjects.get(key)!.asObservable();
  }

  removeEventHandler(eventType: string): void {
    const key = 'bus:' + eventType;
    const subject = this.eventSubjects.get(key);
    if (subject) {
      subject.complete();
      this.eventSubjects.delete(key);
    }
    this.bridge.removeEventHandler(eventType);
  }

  on(event: string): Observable<any> {
    if (!this.eventSubjects.has(event)) {
      const subject = new Subject<any>();
      this.eventSubjects.set(event, subject);
      this.bridge.on(event, (data: any) => {
        this.zone.run(() => subject.next(data));
      });
    }
    return this.eventSubjects.get(event)!.asObservable();
  }
}
