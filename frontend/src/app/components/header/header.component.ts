import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdvisorService } from '../../services/advisor.service';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <header class="app-header">
      <div class="header-container">
        <!-- Logo & Title -->
        <div class="brand-group">
          <div class="logo-badge">
            <app-icon name="sparkles" [size]="24" class="logo-icon"></app-icon>
          </div>
          <div>
            <div class="brand-title">
              <span class="gradient-text">Agentic</span> Advisor
              <span class="version-badge">CrewAI v2</span>
            </div>
            <p class="brand-subtitle">Autonomous Multi-Agent Web Research & Decision Engine</p>
          </div>
        </div>

        <!-- Right Side Actions & Health Badge -->
        <div class="header-actions">
          <!-- Backend Status Indicator -->
          <div 
            class="health-pill"
            [class.online]="advisorService.healthState().status === 'online'"
            [class.offline]="advisorService.healthState().status === 'offline'"
            [class.checking]="advisorService.healthState().status === 'checking'"
            (click)="advisorService.checkHealth()"
            title="Click to re-check API connectivity">
            <span class="status-dot"></span>
            <span class="status-text">
              {{ advisorService.healthState().status === 'online' ? 'API Active' : 
                 advisorService.healthState().status === 'offline' ? 'Backend Offline' : 'Checking...' }}
            </span>
            <app-icon name="refresh" [size]="14" class="refresh-icon" [class.spinning]="advisorService.healthState().status === 'checking'"></app-icon>
          </div>

          <!-- History Drawer Toggle -->
          <button 
            type="button" 
            class="btn-history" 
            (click)="toggleHistory.emit()"
            title="View MongoDB Search History">
            <app-icon name="history" [size]="18"></app-icon>
            <span>History</span>
            <span *ngIf="advisorService.history().length > 0" class="history-count">
              {{ advisorService.history().length }}
            </span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: sticky;
      top: 0;
      z-index: 40;
      padding: 0.875rem 1.5rem;
    }

    .header-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .logo-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
      color: white;
    }

    .brand-title {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .gradient-text {
      background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .version-badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .brand-subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .health-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
    }

    .health-pill.online {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .health-pill.offline {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .health-pill.checking {
      background: rgba(234, 179, 8, 0.1);
      border-color: rgba(234, 179, 8, 0.3);
      color: #facc15;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }

    .refresh-icon {
      opacity: 0.6;
      transition: transform 0.3s ease;
    }

    .health-pill:hover .refresh-icon {
      opacity: 1;
      transform: rotate(90deg);
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .btn-history {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.95rem;
      border-radius: 10px;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #c7d2fe;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-history:hover {
      background: rgba(99, 102, 241, 0.25);
      border-color: rgba(99, 102, 241, 0.4);
      color: #ffffff;
      transform: translateY(-1px);
    }

    .history-count {
      padding: 0.1rem 0.4rem;
      background: #6366f1;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: 9999px;
    }
  `]
})
export class HeaderComponent {
  advisorService = inject(AdvisorService);
  @Output() toggleHistory = new EventEmitter<void>();
}
