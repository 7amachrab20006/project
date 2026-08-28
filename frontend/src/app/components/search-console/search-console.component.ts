import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdvisorService } from '../../services/advisor.service';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-search-console',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="search-console-wrapper">
      <!-- Title & Intro -->
      <div class="console-hero">
        <h1 class="hero-title">
          What hardware are you looking for?
        </h1>
        <p class="hero-subtitle">
          Describe your ideal machine, use case, or budget constraints. Our 3-agent AI crew will search the live web, extract actual specs, calculate deterministic scores, and recommend top picks.
        </p>
      </div>

      <!-- Main Search Box -->
      <form class="search-form" (ngSubmit)="onSubmit()">
        <div class="input-card" [class.focused]="isInputFocused" [class.loading]="advisorService.isRunning()">
          <div class="input-icon">
            <app-icon [name]="advisorService.isRunning() ? 'refresh' : 'search'" [size]="22" [class.spinning]="advisorService.isRunning()"></app-icon>
          </div>
          
          <input 
            type="text" 
            [(ngModel)]="query" 
            name="query" 
            class="search-input"
            placeholder="e.g. Best laptop for programming under 2500 DT with 16GB RAM"
            [disabled]="advisorService.isRunning()"
            (focus)="isInputFocused = true"
            (blur)="isInputFocused = false"
            autocomplete="off" />

          <button 
            type="submit" 
            class="btn-submit" 
            [disabled]="advisorService.isRunning() || !query.trim()">
            <span *ngIf="!advisorService.isRunning()">Ask Agents</span>
            <span *ngIf="advisorService.isRunning()" class="running-text">
              <span class="pulse-dot"></span>
              Working...
            </span>
            <app-icon *ngIf="!advisorService.isRunning()" name="sparkles" [size]="18"></app-icon>
          </button>
        </div>
      </form>

      <!-- Preset Suggestion Chips -->
      <div class="quick-prompts">
        <span class="prompts-label">Quick Suggestions:</span>
        <div class="chips-container">
          <button 
            type="button" 
            *ngFor="let prompt of presetPrompts" 
            class="prompt-chip" 
            [disabled]="advisorService.isRunning()"
            (click)="selectPreset(prompt)">
            <span class="chip-dot"></span>
            {{ prompt }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-console-wrapper {
      max-width: 900px;
      margin: 2.5rem auto 1.5rem;
      padding: 0 1rem;
      text-align: center;
    }

    .console-hero {
      margin-bottom: 2rem;
    }

    .hero-title {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #f8fafc;
      margin-bottom: 0.75rem;
      line-height: 1.2;
    }

    .hero-subtitle {
      font-size: 1rem;
      color: #94a3b8;
      max-width: 720px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .search-form {
      position: relative;
      margin-bottom: 1.5rem;
    }

    .input-card {
      display: flex;
      align-items: center;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 0.5rem 0.5rem 0.5rem 1.25rem;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.05);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .input-card.focused {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25), 0 15px 35px -5px rgba(0, 0, 0, 0.6);
      background: rgba(30, 41, 59, 0.95);
    }

    .input-card.loading {
      border-color: rgba(99, 102, 241, 0.4);
    }

    .input-icon {
      color: #818cf8;
      display: flex;
      align-items: center;
      margin-right: 0.85rem;
    }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 1.05rem;
      outline: none;
      font-weight: 400;
    }

    .search-input::placeholder {
      color: #64748b;
    }

    .btn-submit {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.85rem 1.5rem;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .running-text {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: white;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    .quick-prompts {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .prompts-label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .chips-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }

    .prompt-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.85rem;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 9999px;
      font-size: 0.825rem;
      color: #cbd5e1;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .prompt-chip:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.35);
      color: #f8fafc;
      transform: translateY(-1px);
    }

    .chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #818cf8;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class SearchConsoleComponent {
  advisorService = inject(AdvisorService);
  @Output() search = new EventEmitter<string>();

  query = '';
  isInputFocused = false;

  presetPrompts: string[] = [
    'laptop for programming under 2500 DT',
    'best lightweight laptop for university student under 1000$',
    'gaming laptop with high battery life and 16GB RAM',
    'coding ultrabook with 32GB RAM under 2000 USD'
  ];

  onSubmit(): void {
    if (this.query.trim() && !this.advisorService.isRunning()) {
      this.search.emit(this.query.trim());
    }
  }

  selectPreset(prompt: string): void {
    this.query = prompt;
    this.onSubmit();
  }
}
