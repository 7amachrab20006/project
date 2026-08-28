import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError, interval, Subscription } from 'rxjs';
import { 
  FinalRecommendation, 
  RecommendationRequest, 
  SearchHistoryItem, 
  SystemHealth, 
  AgentStep 
} from '../models/recommendation.model';

@Injectable({
  providedIn: 'root'
})
export class AdvisorService {
  private readonly apiUrl = 'http://127.0.0.1:8000';

  // State Signals
  readonly healthState = signal<SystemHealth>({ status: 'checking', message: 'Connecting to API...' });
  readonly isRunning = signal<boolean>(false);
  readonly currentQuery = signal<string>('');
  readonly recommendation = signal<FinalRecommendation | null>(null);
  readonly history = signal<SearchHistoryItem[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly activeAgentStepIndex = signal<number>(0);
  readonly elapsedSeconds = signal<number>(0);

  private timerSubscription?: Subscription;

  readonly agentSteps = signal<AgentStep[]>([
    {
      id: 'researcher',
      name: 'Product Researcher',
      role: 'Web Spec Discovery',
      description: 'Searches real-time web via Tavily API and extracts hardware specifications.',
      icon: 'search',
      status: 'idle'
    },
    {
      id: 'analyzer',
      name: 'Product Analyst',
      role: 'Mathematical Scoring',
      description: 'Scores & ranks candidate laptops using deterministic Python calculation tools.',
      icon: 'cpu',
      status: 'idle'
    },
    {
      id: 'recommender',
      name: 'Recommendation Agent',
      role: 'Synthesis & Justification',
      description: 'Selects top 3 products, synthesizes reasons, and validates against Pydantic schema.',
      icon: 'sparkles',
      status: 'idle'
    }
  ]);

  constructor(private http: HttpClient) {
    this.checkHealth();
    this.loadHistory();
  }

  checkHealth(): void {
    this.healthState.set({ status: 'checking', message: 'Pinging backend...' });
    this.http.get<{ status: string }>(`${this.apiUrl}/health`).pipe(
      catchError(err => {
        this.healthState.set({
          status: 'offline',
          message: 'Backend offline (ensure uvicorn is running on port 8000)',
          lastChecked: new Date()
        });
        return of(null);
      })
    ).subscribe(res => {
      if (res && res.status === 'ok') {
        this.healthState.set({
          status: 'online',
          message: 'FastAPI Backend Connected',
          lastChecked: new Date()
        });
      }
    });
  }

  loadHistory(limit: number = 10): void {
    this.http.get<SearchHistoryItem[]>(`${this.apiUrl}/searches?limit=${limit}`).pipe(
      catchError(err => {
        console.warn('Could not load history from MongoDB:', err);
        return of([]);
      })
    ).subscribe(items => {
      if (Array.isArray(items)) {
        this.history.set(items);
      }
    });
  }

  getRecommendations(userRequest: string): Observable<FinalRecommendation> {
    const trimmed = userRequest.trim();
    if (!trimmed) {
      return throwError(() => new Error('Search query cannot be empty'));
    }

    this.isRunning.set(true);
    this.errorMessage.set(null);
    this.currentQuery.set(trimmed);
    this.elapsedSeconds.set(0);
    this.startPipelineProgress();

    const body: RecommendationRequest = { user_request: trimmed };

    return this.http.post<FinalRecommendation>(`${this.apiUrl}/recommend`, body).pipe(
      tap(result => {
        this.stopPipelineProgress(true);
        this.recommendation.set(result);
        this.isRunning.set(false);
        this.loadHistory();
      }),
      catchError(err => {
        this.stopPipelineProgress(false);
        this.isRunning.set(false);
        const errorDetail = err?.error?.detail || err?.message || 'Agent pipeline execution failed.';
        this.errorMessage.set(errorDetail);
        return throwError(() => new Error(errorDetail));
      })
    );
  }

  selectHistoryItem(item: SearchHistoryItem): void {
    this.currentQuery.set(item.user_request);
    this.recommendation.set(item.recommendation);
    this.errorMessage.set(null);

    // Set steps to completed
    this.agentSteps.update(steps =>
      steps.map(s => ({ ...s, status: 'completed' }))
    );
  }

  clearActiveResults(): void {
    this.recommendation.set(null);
    this.errorMessage.set(null);
    this.currentQuery.set('');
    this.resetAgentSteps();
  }

  private startPipelineProgress(): void {
    this.resetAgentSteps();
    this.agentSteps.update(steps => {
      const copy = [...steps];
      copy[0].status = 'running';
      return copy;
    });

    let currentStep = 0;
    this.timerSubscription?.unsubscribe();

    this.timerSubscription = interval(1000).subscribe(sec => {
      this.elapsedSeconds.set(sec + 1);

      // Transition simulated agent steps based on realistic timing
      if (sec === 8 && currentStep === 0) {
        currentStep = 1;
        this.agentSteps.update(steps => [
          { ...steps[0], status: 'completed' },
          { ...steps[1], status: 'running' },
          { ...steps[2], status: 'idle' }
        ]);
      } else if (sec === 16 && currentStep === 1) {
        currentStep = 2;
        this.agentSteps.update(steps => [
          { ...steps[0], status: 'completed' },
          { ...steps[1], status: 'completed' },
          { ...steps[2], status: 'running' }
        ]);
      }
    });
  }

  private stopPipelineProgress(success: boolean): void {
    this.timerSubscription?.unsubscribe();
    this.agentSteps.update(steps =>
      steps.map(s => ({
        ...s,
        status: success ? 'completed' : s.status === 'running' ? 'failed' : s.status
      }))
    );
  }

  private resetAgentSteps(): void {
    this.agentSteps.update(steps =>
      steps.map(s => ({ ...s, status: 'idle' }))
    );
  }
}
