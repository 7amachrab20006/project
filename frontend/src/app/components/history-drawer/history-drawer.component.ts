import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdvisorService } from '../../services/advisor.service';
import { SearchHistoryItem } from '../../models/recommendation.model';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-history-drawer',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="drawer-backdrop" *ngIf="isOpen" (click)="close.emit()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <!-- Drawer Header -->
        <div class="drawer-header">
          <div class="header-title-group">
            <div class="header-icon">
              <app-icon name="database" [size]="20"></app-icon>
            </div>
            <div>
              <h3 class="drawer-title">Search History</h3>
              <p class="drawer-subtitle">Logged automatically in MongoDB</p>
            </div>
          </div>

          <div class="header-actions">
            <button type="button" class="icon-btn" (click)="advisorService.loadHistory()" title="Refresh History">
              <app-icon name="refresh" [size]="16"></app-icon>
            </button>
            <button type="button" class="icon-btn" (click)="close.emit()" title="Close Drawer">
              <app-icon name="x" [size]="18"></app-icon>
            </button>
          </div>
        </div>

        <!-- History Content -->
        <div class="drawer-body">
          <div *ngIf="advisorService.history().length === 0" class="empty-state">
            <app-icon name="history" [size]="40" class="empty-icon"></app-icon>
            <h4>No searches recorded yet</h4>
            <p>Searches executed through the AI agents will appear here automatically.</p>
          </div>

          <div *ngIf="advisorService.history().length > 0" class="history-list">
            <div 
              *ngFor="let item of advisorService.history(); let i = index" 
              class="history-card"
              (click)="onSelect(item)">
              
              <div class="card-top">
                <span class="history-tag">#{{ advisorService.history().length - i }}</span>
                <span class="products-count" *ngIf="item.recommendation?.recommended_products">
                  {{ item.recommendation.recommended_products.length }} laptops recommended
                </span>
              </div>

              <h4 class="history-query">"{{ item.user_request }}"</h4>

              <p class="history-snippet" *ngIf="item.recommendation?.summary">
                {{ item.recommendation.summary }}
              </p>

              <div class="history-footer">
                <span class="action-hint">Click to load results</span>
                <app-icon name="chevron-right" [size]="14"></app-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 50;
      display: flex;
      justify-content: flex-end;
      animation: fadeIn 0.2s ease-out;
    }

    .drawer-panel {
      width: 100%;
      max-width: 440px;
      height: 100%;
      background: #0f172a;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.6);
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      padding: 1.25rem 1.5rem;
      background: rgba(30, 41, 59, 0.7);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drawer-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .drawer-subtitle {
      font-size: 0.75rem;
      color: #94a3b8;
      margin: 0.1rem 0 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #64748b;
    }

    .empty-icon {
      color: #475569;
      margin-bottom: 1rem;
    }

    .empty-state h4 {
      color: #94a3b8;
      margin: 0 0 0.5rem;
      font-size: 1rem;
    }

    .empty-state p {
      font-size: 0.825rem;
      line-height: 1.5;
      margin: 0;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .history-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .history-card:hover {
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.3);
      transform: translateX(-2px);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .history-tag {
      font-size: 0.675rem;
      font-weight: 700;
      color: #818cf8;
      text-transform: uppercase;
    }

    .products-count {
      font-size: 0.7rem;
      color: #34d399;
      background: rgba(16, 185, 129, 0.1);
      padding: 0.1rem 0.45rem;
      border-radius: 4px;
      font-weight: 600;
    }

    .history-query {
      font-size: 0.925rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 0.5rem;
      line-height: 1.4;
    }

    .history-snippet {
      font-size: 0.775rem;
      color: #94a3b8;
      margin: 0 0 0.75rem;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .history-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #818cf8;
      font-size: 0.75rem;
      font-weight: 600;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 0.5rem;
    }
  `]
})
export class HistoryDrawerComponent {
  advisorService = inject(AdvisorService);
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  onSelect(item: SearchHistoryItem): void {
    this.advisorService.selectHistoryItem(item);
    this.close.emit();
  }
}
