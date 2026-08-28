import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdvisorService } from './services/advisor.service';
import { HeaderComponent } from './components/header/header.component';
import { SearchConsoleComponent } from './components/search-console/search-console.component';
import { AgentPipelineComponent } from './components/agent-pipeline/agent-pipeline.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { ComparisonTableComponent } from './components/comparison-table/comparison-table.component';
import { SummaryCardComponent } from './components/summary-card/summary-card.component';
import { HistoryDrawerComponent } from './components/history-drawer/history-drawer.component';
import { IconComponent } from './components/icons/icon.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SearchConsoleComponent,
    AgentPipelineComponent,
    ProductCardComponent,
    ComparisonTableComponent,
    SummaryCardComponent,
    HistoryDrawerComponent,
    IconComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  advisorService = inject(AdvisorService);
  isHistoryOpen = false;

  onSearch(query: string): void {
    this.advisorService.getRecommendations(query).subscribe({
      next: (res) => {
        // Automatically scroll to results on desktop
        setTimeout(() => {
          const resultsElem = document.getElementById('recommendation-results');
          resultsElem?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      error: (err) => {
        console.error('Recommendation failed:', err);
      }
    });
  }

  toggleHistory(): void {
    this.isHistoryOpen = !this.isHistoryOpen;
  }
}
