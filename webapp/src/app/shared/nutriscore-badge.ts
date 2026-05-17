import { Component, input } from '@angular/core';

@Component({
  selector: 'app-nutriscore-badge',
  standalone: true,
  template: `
    <span class="badge" [style.background-color]="getColor()">
      {{ grade().toUpperCase() }}
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      line-height: 1;
    }
  `,
})
export class NutriscoreBadgeComponent {
  grade = input<string>('');

  private readonly colors: Record<string, string> = {
    a: '#038141',
    b: '#85bb2f',
    c: '#fecb02',
    d: '#ee8100',
    e: '#e63e11',
  };

  getColor(): string {
    return this.colors[this.grade().toLowerCase()] || '#999';
  }
}
