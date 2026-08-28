import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecommendedProduct } from '../../models/recommendation.model';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="product-card" [class.rank-first]="rank === 1">
      <!-- Top Badges -->
      <div class="card-header">
        <div class="rank-badge" [ngClass]="'rank-' + rank">
          <app-icon [name]="rank === 1 ? 'award' : 'check'" [size]="14"></app-icon>
          <span>#{{ rank }} Choice</span>
        </div>

        <div class="score-badge" [title]="'Score calculated by Python tool: ' + product.score">
          <span class="score-num">{{ product.score }}</span>
          <span class="score-max">/100</span>
        </div>
      </div>

      <!-- Product Name -->
      <h3 class="product-name" [title]="product.name">
        {{ product.name }}
      </h3>

      <!-- Price Highlight -->
      <div class="price-section">
        <div class="price-label">Estimated Price</div>
        <div class="price-value" *ngIf="product.price > 0">
          {{ product.price | number:'1.0-2' }} <span class="currency-tag">DT / USD</span>
        </div>
        <div class="price-unknown" *ngIf="product.price === 0">
          <span>Price not listed</span>
        </div>
      </div>

      <!-- Specs Grid -->
      <div class="specs-grid">
        <!-- CPU -->
        <div class="spec-item">
          <div class="spec-icon"><app-icon name="cpu" [size]="16"></app-icon></div>
          <div class="spec-info">
            <span class="spec-label">Processor</span>
            <span class="spec-value" [title]="product.cpu">{{ product.cpu !== 'unknown' ? product.cpu : 'Unspecified' }}</span>
          </div>
        </div>

        <!-- RAM -->
        <div class="spec-item">
          <div class="spec-icon"><app-icon name="ram" [size]="16"></app-icon></div>
          <div class="spec-info">
            <span class="spec-label">Memory</span>
            <span class="spec-value">{{ product.ram > 0 ? (product.ram + ' GB RAM') : 'Not listed' }}</span>
          </div>
        </div>

        <!-- Battery -->
        <div class="spec-item">
          <div class="spec-icon"><app-icon name="battery" [size]="16"></app-icon></div>
          <div class="spec-info">
            <span class="spec-label">Battery Life</span>
            <span class="spec-value">{{ product.battery_hours > 0 ? (product.battery_hours + ' Hours') : 'Not listed' }}</span>
          </div>
        </div>
      </div>

      <!-- AI Justification -->
      <div class="reason-card">
        <div class="reason-header">
          <app-icon name="sparkles" [size]="14"></app-icon>
          <span>Agent Recommendation Reason</span>
        </div>
        <p class="reason-text">{{ product.reason }}</p>
      </div>

      <!-- Web Source Footer -->
      <div class="card-footer" *ngIf="product.source_url">
        <a [href]="product.source_url" target="_blank" rel="noopener noreferrer" class="source-link">
          <span>View Source Web Page</span>
          <app-icon name="external-link" [size]="14"></app-icon>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .product-card {
      background: rgba(30, 41, 59, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }

    .product-card:hover {
      transform: translateY(-4px);
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.5), 0 0 25px rgba(99, 102, 241, 0.1);
    }

    .product-card.rank-first {
      border-color: rgba(99, 102, 241, 0.35);
      background: linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, rgba(30, 41, 59, 0.8) 100%);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .rank-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.65rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .rank-badge.rank-1 {
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
    }

    .rank-badge.rank-2 {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
    }

    .rank-badge.rank-3 {
      background: rgba(148, 163, 184, 0.15);
      border: 1px solid rgba(148, 163, 184, 0.3);
      color: #cbd5e1;
    }

    .score-badge {
      display: flex;
      align-items: baseline;
      gap: 0.15rem;
      padding: 0.3rem 0.7rem;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      color: #34d399;
    }

    .score-num {
      font-size: 1rem;
      font-weight: 800;
    }

    .score-max {
      font-size: 0.7rem;
      opacity: 0.7;
      font-weight: 600;
    }

    .product-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 0.75rem;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 3.3rem;
    }

    .price-section {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
    }

    .price-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.2rem;
    }

    .price-value {
      font-size: 1.35rem;
      font-weight: 800;
      color: #38bdf8;
    }

    .currency-tag {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
    }

    .price-unknown {
      font-size: 0.95rem;
      color: #64748b;
      font-style: italic;
    }

    .specs-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.6rem;
      margin-bottom: 1.25rem;
    }

    .spec-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: rgba(15, 23, 42, 0.35);
      border-radius: 10px;
    }

    .spec-icon {
      color: #818cf8;
      display: flex;
      align-items: center;
    }

    .spec-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .spec-label {
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }

    .spec-value {
      font-size: 0.85rem;
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .reason-card {
      background: rgba(99, 102, 241, 0.06);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 12px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
      flex: 1;
    }

    .reason-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.725rem;
      font-weight: 700;
      color: #a5b4fc;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.4rem;
    }

    .reason-text {
      font-size: 0.825rem;
      color: #cbd5e1;
      line-height: 1.5;
      margin: 0;
    }

    .card-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 1rem;
      margin-top: auto;
    }

    .source-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem 1rem;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .source-link:hover {
      background: #6366f1;
      color: white;
      border-color: #6366f1;
    }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: RecommendedProduct;
  @Input() rank: number = 1;
}
