import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdvisorService } from '../../services/advisor.service';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-agent-pipeline',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="pipeline-card" *ngIf="advisorService.isRunning() || advisorService.recommendation()">
      <div class="pipeline-header">
        <div class="pipeline-title-group">
          <div class="glow-indicator" [class.active]="advisorService.isRunning()"></div>
          <div>
            <h3 class="pipeline-title">Autonomous CrewAI Agent Workflow</h3>
            <p class="pipeline-subtitle">
              {{ advisorService.isRunning() ? 'Agents actively executing chained tasks in sequence' : 'Pipeline execution complete' }}
            </p>
          </div>
        </div>

        <div class="timer-badge" *ngIf="advisorService.isRunning()">
          <app-icon name="history" [size]="14"></app-icon>
          <span>Elapsed: {{ advisorService.elapsedSeconds() }}s</span>
        </div>
      </div>

      <!-- Agent Steps Pipeline -->
      <div class="steps-grid">
        <div 
          *ngFor="let step of advisorService.agentSteps(); let i = index" 
          class="step-item"
          [class.running]="step.status === 'running'"
          [class.completed]="step.status === 'completed'"
          [class.failed]="step.status === 'failed'"
          [class.idle]="step.status === 'idle'">
          
          <div class="step-badge-wrap">
            <div class="step-avatar">
              <app-icon [name]="step.icon" [size]="20"></app-icon>
            </div>
            <div class="status-indicator">
              <app-icon *ngIf="step.status === 'completed'" name="check" [size]="14"></app-icon>
              <app-icon *ngIf="step.status === 'running'" name="refresh" [size]="14" class="spinning"></app-icon>
              <app-icon *ngIf="step.status === 'failed'" name="alert" [size]="14"></app-icon>
              <span *ngIf="step.status === 'idle'" class="idle-dot"></span>
            </div>
          </div>

          <div class="step-content">
            <div class="step-top">
              <span class="step-number">Agent 0{{ i + 1 }}</span>
              <span class="step-status-tag" [ngClass]="step.status">{{ step.status | titlecase }}</span>
            </div>
            <h4 class="step-name">{{ step.name }}</h4>
            <div class="step-role">{{ step.role }}</div>
            <p class="step-desc">{{ step.description }}</p>
          </div>

          <!-- Connecting Arrow on larger screens -->
          <div class="step-arrow" *ngIf="i < advisorService.agentSteps().length - 1">
            <app-icon name="chevron-right" [size]="18"></app-icon>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pipeline-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 1.5rem;
      max-width: 1200px;
      margin: 1.5rem auto 2.5rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }

    .pipeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .pipeline-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .glow-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #64748b;
    }

    .glow-indicator.active {
      background: #10b981;
      box-shadow: 0 0 12px #10b981;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    .pipeline-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .pipeline-subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0.15rem 0 0;
    }

    .timer-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 9999px;
      color: #a5b4fc;
      font-size: 0.8rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
      position: relative;
    }

    .step-item {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      gap: 1rem;
      position: relative;
      transition: all 0.3s ease;
    }

    .step-item.running {
      background: rgba(99, 102, 241, 0.08);
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
    }

    .step-item.completed {
      background: rgba(16, 185, 129, 0.05);
      border-color: rgba(16, 185, 129, 0.25);
    }

    .step-item.failed {
      background: rgba(239, 68, 68, 0.05);
      border-color: rgba(239, 68, 68, 0.25);
    }

    .step-badge-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .step-avatar {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(51, 65, 85, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      transition: all 0.3s ease;
    }

    .step-item.running .step-avatar {
      background: #6366f1;
      color: #ffffff;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
    }

    .step-item.completed .step-avatar {
      background: #10b981;
      color: #ffffff;
    }

    .step-item.failed .step-avatar {
      background: #ef4444;
      color: #ffffff;
    }

    .status-indicator {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      border: 2px solid #0f172a;
    }

    .step-item.completed .status-indicator {
      color: #10b981;
    }

    .step-item.running .status-indicator {
      color: #818cf8;
    }

    .step-item.failed .status-indicator {
      color: #ef4444;
    }

    .idle-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #64748b;
    }

    .step-content {
      flex: 1;
    }

    .step-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .step-number {
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .step-status-tag {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.1rem 0.4rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }

    .step-status-tag.idle {
      background: rgba(100, 116, 139, 0.15);
      color: #94a3b8;
    }

    .step-status-tag.running {
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }

    .step-status-tag.completed {
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
    }

    .step-status-tag.failed {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }

    .step-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .step-role {
      font-size: 0.75rem;
      color: #818cf8;
      font-weight: 500;
      margin-bottom: 0.35rem;
    }

    .step-desc {
      font-size: 0.75rem;
      color: #94a3b8;
      line-height: 1.4;
      margin: 0;
    }

    .step-arrow {
      position: absolute;
      right: -14px;
      top: 50%;
      transform: translateY(-50%);
      color: #475569;
      z-index: 5;
      display: none;
    }

    @media (min-width: 1024px) {
      .step-arrow {
        display: block;
      }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class AgentPipelineComponent {
  advisorService = inject(AdvisorService);
}
