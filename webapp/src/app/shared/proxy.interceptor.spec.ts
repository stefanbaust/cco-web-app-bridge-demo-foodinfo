import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { proxyInterceptor } from './proxy.interceptor';

describe('proxyInterceptor', () => {
  const originalUrl = window.location.href;

  const capture = () => {
    const seen: HttpRequest<unknown>[] = [];
    const next: HttpHandlerFn = (req): Observable<HttpEvent<unknown>> => {
      seen.push(req);
      return of({} as HttpEvent<unknown>);
    };
    return { seen, next };
  };

  const run = (url: string, method = 'GET', body: unknown = null) => {
    const { seen, next } = capture();
    proxyInterceptor(new HttpRequest(method as 'GET', url, body), next).subscribe();
    return seen[0];
  };

  beforeEach(() => history.pushState({}, '', '/'));
  afterEach(() => history.pushState({}, '', originalUrl));

  it('leaves requests untouched while the app runs outside the POS', () => {
    const forwarded = run('https://world.openfoodfacts.org/api/v2/product/1');

    expect(forwarded.url).toBe('https://world.openfoodfacts.org/api/v2/product/1');
    expect(forwarded.method).toBe('GET');
  });

  it('routes external requests through the plugin proxy when served by the POS', () => {
    history.pushState({}, '', '/ctx/PluginServlet?action=FOODINFOServlet');

    const forwarded = run('https://world.openfoodfacts.org/api/v2/product/1');

    expect(forwarded.method).toBe('POST');
    expect(forwarded.url).toBe(`${window.location.origin}/ctx/PluginServlet?action=FOODINFOProxy`);
    expect(forwarded.body).toEqual({
      url: 'https://world.openfoodfacts.org/api/v2/product/1',
      method: 'GET',
      headers: {},
      body: '',
    });
  });

  it('keeps plugin-relative requests on the servlet', () => {
    history.pushState({}, '', '/ctx/PluginServlet?action=FOODINFOServlet');

    const forwarded = run('PluginServlet?action=FOODINFOResource&path=main.js');

    expect(forwarded.method).toBe('GET');
    expect(forwarded.url).toBe('PluginServlet?action=FOODINFOResource&path=main.js');
  });

  it('serialises a request body for the proxy', () => {
    history.pushState({}, '', '/ctx/PluginServlet?action=FOODINFOServlet');

    const forwarded = run('https://example.org/x', 'POST', { a: 1 });

    expect((forwarded.body as { body: string }).body).toBe('{"a":1}');
  });
});
