import { Component, OnInit } from '@angular/core';
import { DialPlan, DialPlanService } from '../../services/dial-plan.service';

@Component({
  selector: 'app-dial-plan-list',
  templateUrl: './dial-plan-list.component.html',
  styleUrls: ['./dial-plan-list.component.css']
})
export class DialPlanListComponent implements OnInit {
  dialPlans: DialPlan[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;

  // Properties for config preview
  generatedConfig: string | null = null;
  selectedDialPlanForPreview: DialPlan | null = null;
  isPreviewLoading: boolean = false;
  previewErrorMessage: string | null = null;

  constructor(private dialPlanService: DialPlanService) { }

  ngOnInit(): void {
    this.loadDialPlans();
  }

  loadDialPlans(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.dialPlanService.getDialPlans().subscribe({
      next: (data) => {
        this.dialPlans = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching dial plans:', err);
        this.errorMessage = 'Failed to load dial plans. Please ensure the backend is running and accessible.';
        this.isLoading = false;
      }
    });
  }

  deleteDialPlan(id: number): void {
    this.dialPlanService.deleteDialPlan(id).subscribe({
      next: () => {
        this.dialPlans = this.dialPlans.filter(dp => dp.id !== id);
        if (this.selectedDialPlanForPreview && this.selectedDialPlanForPreview.id === id) {
          this.closePreview(); // Close preview if the deleted dial plan was being previewed
        }
      },
      error: (err) => {
        console.error('Error deleting dial plan:', err);
        this.errorMessage = `Failed to delete dial plan: ${err.error?.message || err.message}`;
      }
    });
  }

  deleteDialPlanWrapper(id: number, name: string): void {
    if (confirm(`Are you sure you want to delete dial plan "${name}"? This action cannot be undone.`)) {
      this.deleteDialPlan(id);
    }
  }

  // Methods for config preview
  onGenerateConfig(dialPlan: DialPlan): void {
    this.selectedDialPlanForPreview = dialPlan;
    this.generatedConfig = null; // Clear previous
    this.previewErrorMessage = null;
    this.isPreviewLoading = true;
    this.dialPlanService.generateDialPlanConfig(dialPlan.id).subscribe({
      next: (configText) => {
        this.generatedConfig = configText;
        this.isPreviewLoading = false;
      },
      error: (error) => {
        console.error('Error generating dial plan config:', error);
        // Attempt to parse backend plain text error if available
        this.previewErrorMessage = `Error generating config: ${error.error || error.message || 'Unknown server error'}`;
        this.isPreviewLoading = false;
      }
    });
  }

  closePreview(): void {
    this.selectedDialPlanForPreview = null;
    this.generatedConfig = null;
    this.previewErrorMessage = null;
  }

  downloadGeneratedConfig(): void {
    if (!this.generatedConfig || !this.selectedDialPlanForPreview) return;

    const blob = new Blob([this.generatedConfig], { type: 'text/plain;charset=utf-8' });
    const filename = `${this.selectedDialPlanForPreview.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_extensions.conf`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link); // Clean up
    URL.revokeObjectURL(link.href); // Release object URL
  }
}
