import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecommendedProduct } from '../../models/recommendation.model';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-comparison-table',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="comparison-container" *ngIf="products && products.length > 0">
      <div class="comparison-header">
        <div>
          <h3 class="title">Specs & Scoring Comparison Matrix</h3>
          <p class="subtitle">Side-by-side breakdown calculated by deterministic scoring rules</p>
        </div>
      </div>

      <div class="table-responsive">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Model Name</th>
              <th>Score</th>
              <th>Price</th>
              <th>Processor</th>
              <th>RAM</th>
              <th>Battery Life</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products; let i = index" [class.highlight-first]="i === 0">
              <td class="name-cell">
                <span class="rank-tag">#{{ i + 1 }}</span>
                <span class="product-title" [title]="product.name">{{ product.name }}</span>
              </td>
              <td>
                <span class="score-pill">{{ product.score }}/100</span>
              </td>
              <td class="price-cell">
                <span *ngIf="product.price > 0">{{ product.price | number:'1.0-2' }}</span>
                <span *ngIf="product.price === 0" class="muted-text">Not listed</span>
              </td>
              <td>
                <span class="cpu-text" [title]="product.cpu">{{ product.cpu !== 'unknown' ? product.cpu : 'Unspecified' }}</span>
              </td>
              <td>
                <span *ngIf="product.ram > 0" class="badge-pill">{{ product.ram }} GB</span>
                <span *ngIf="product.ram === 0" class="muted-text">0</span>
              </td>
              <td>
                <span *ngIf="product.battery_hours > 0" class="badge-pill battery">{{ product.battery_hours }} hrs</span>
                <span *ngIf="product.battery_hours === 0" class="muted-text">0</span>
              </td>
              <td>
                <a *ngIf="product.source_url" [href]="product.source_url" target="_blank" rel="noopener noreferrer" class="link-btn">
                  <app-icon name="external-link" [size]="14"></app-icon>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .comparison-container {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 1.5rem;
      margin: 2rem auto;
      max-width: 1200px;
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }

    .comparison-header {
      margin-bottom: 1.25rem;
    }

    .title {
      font-size: 1.2rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0.2rem 0 0;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    .comparison-table th {
      padding: 0.75rem 1rem;
      background: rgba(15, 23, 42, 0.6);
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .comparison-table td {
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #e2e8f0;
      vertical-align: middle;
    }

    .comparison-table tr:hover td {
      background: rgba(99, 102, 241, 0.05);
    }

    .comparison-table tr.highlight-first td {
      background: rgba(99, 102, 241, 0.08);
    }

    .name-cell {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 600;
      min-width: 200px;
    }

    .rank-tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }

    .product-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 250px;
    }

    .score-pill {
      font-weight: 700;
      color: #34d399;
      background: rgba(16, 185, 129, 0.1);
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .price-cell {
      font-weight: 700;
      color: #38bdf8;
    }

    .cpu-text {
      max-width: 160px;
      display: inline-block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #cbd5e1;
    }

    .badge-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      background: rgba(51, 65, 85, 0.6);
      color: #e2e8f0;
    }

    .badge-pill.battery {
      background: rgba(14, 165, 233, 0.15);
      color: #7dd3fc;
      border: 1px solid rgba(14, 165, 233, 0.3);
    }

    .muted-text {
      color: #64748b;
      font-size: 0.8rem;
    }

    .link-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      transition: all 0.2s ease;
    }

    .link-btn:hover {
      background: #6366f1;
      color: white;
    }
  `]
})
export class ComparisonTableComponent {
  @Input({ required: true }) products: RecommendedProduct[] = [];
}
