import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinalRecommendation } from '../../models/recommendation.model';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="summary-wrapper" *ngIf="recommendation">
      <div class="summary-glow-border">
        <div class="summary-inner">
          <div class="summary-top">
            <div class="header-left">
              <div class="ai-avatar">
                <app-icon name="sparkles" [size]="20"></app-icon>
              </div>
              <div>
                <h3 class="summary-title">Executive AI Recommendation</h3>
                <div class="query-badge">
                  <span>Prompt:</span> "{{ recommendation.user_request }}"
                </div>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="summary-actions">
              <button type="button" class="btn-tool" (click)="copySummary()" title="Copy Summary Text">
                <app-icon [name]="copied ? 'check' : 'copy'" [size]="16"></app-icon>
                <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
              </button>

              <button type="button" class="btn-tool" (click)="exportJson()" title="Download JSON Deliverable">
                <app-icon name="external-link" [size]="16"></app-icon>
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          <!-- Summary Body Text -->
          <div class="summary-content">
            <p class="summary-text">{{ recommendation.summary }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .summary-wrapper {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 0.5rem;
    }

    .summary-glow-border {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(168, 85, 247, 0.3) 50%, rgba(236, 72, 153, 0.4) 100%);
      padding: 1px;
      border-radius: 20px;
      box-shadow: 0 10px 30px -5px rgba(99, 102, 241, 0.2);
    }

    .summary-inner {
      background: rgba(15, 23, 42, 0.95);
      border-radius: 19px;
      padding: 1.5rem;
      backdrop-filter: blur(16px);
    }

    .summary-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .ai-avatar {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .summary-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .query-badge {
      font-size: 0.775rem;
      color: #94a3b8;
      margin-top: 0.15rem;
    }

    .query-badge span {
      color: #818cf8;
      font-weight: 600;
    }

    .summary-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-tool {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: #cbd5e1;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-tool:hover {
      background: rgba(99, 102, 241, 0.2);
      border-color: rgba(99, 102, 241, 0.4);
      color: white;
    }

    .summary-content {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 1.25rem;
    }

    .summary-text {
      font-size: 0.95rem;
      line-height: 1.65;
      color: #e2e8f0;
      margin: 0;
    }
  `]
})
export class SummaryCardComponent {
  @Input({ required: true }) recommendation!: FinalRecommendation;
  copied = false;

  copySummary(): void {
    if (this.recommendation?.summary) {
      navigator.clipboard.writeText(this.recommendation.summary).then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 2000);
      });
    }
  }

  exportJson(): void {
    if (!this.recommendation) return;
    const blob = new Blob([JSON.stringify(this.recommendation, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-recommendation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
