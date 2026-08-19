import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { NutriscoreBadgeComponent } from './nutriscore-badge';

describe('NutriscoreBadgeComponent', () => {
  let fixture: ComponentFixture<NutriscoreBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NutriscoreBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(NutriscoreBadgeComponent);
  });

  it('renders the grade in upper case', () => {
    fixture.componentRef.setInput('grade', 'b');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('B');
  });

  it('uses the official Nutri-Score colour per grade', () => {
    const colors = ['a', 'b', 'c', 'd', 'e'].map((grade) => {
      fixture.componentRef.setInput('grade', grade.toUpperCase());
      return fixture.componentInstance.getColor();
    });

    expect(colors).toEqual(['#038141', '#85bb2f', '#fecb02', '#ee8100', '#e63e11']);
  });

  it('falls back to grey for products without a Nutri-Score', () => {
    fixture.componentRef.setInput('grade', '');

    expect(fixture.componentInstance.getColor()).toBe('#999');
  });
});
