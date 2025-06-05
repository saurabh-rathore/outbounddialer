import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialPlan, DialPlanService } from '../../services/dial-plan.service';

@Component({
  selector: 'app-dial-plan-form',
  templateUrl: './dial-plan-form.component.html',
  styleUrls: ['./dial-plan-form.component.css']
})
export class DialPlanFormComponent implements OnInit {
  dialPlan: Partial<DialPlan> = {
    name: '',
    description: '',
    configuration: {}
  };
  configurationText: string = ''; // For textarea binding
  isEditMode: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  pageTitle: string = 'Create Dial Plan'; // Dynamic page title

  constructor(
    private dialPlanService: DialPlanService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = +idParam; // Convert string id to number
      this.isEditMode = true;
      this.pageTitle = 'Edit Dial Plan';
      this.isLoading = true;
      this.dialPlanService.getDialPlan(id).subscribe({
        next: (data) => {
          this.dialPlan = data;
          this.configurationText = JSON.stringify(this.dialPlan.configuration, null, 2);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching dial plan:', err);
          this.errorMessage = `Failed to load dial plan: ${err.error?.message || err.message}`;
          this.isLoading = false;
        }
      });
    } else {
      // Initialize with a default pretty-printed empty JSON object for new dial plans
      this.configurationText = JSON.stringify({}, null, 2);
    }
  }

  isValidJson(): boolean {
    if (!this.configurationText.trim()) return false; // JSON cannot be empty or just whitespace
    try {
      JSON.parse(this.configurationText);
      return true;
    } catch (e) {
      return false;
    }
  }

  isFormValid(): boolean {
    return !!this.dialPlan.name && !!this.configurationText.trim() && this.isValidJson();
  }

  saveDialPlan(): void {
    this.errorMessage = '';
    this.isLoading = true;

    let configObject;
    try {
      configObject = JSON.parse(this.configurationText);
    } catch (e) {
      this.errorMessage = 'Invalid JSON format in configuration.';
      this.isLoading = false;
      return;
    }

    const finalDialPlan: Partial<DialPlan> = {
      ...this.dialPlan,
      configuration: configObject
    };

    if (this.isEditMode && finalDialPlan.id) {
      this.dialPlanService.updateDialPlan(finalDialPlan.id, finalDialPlan).subscribe({
        next: () => {
          this.router.navigate(['/dialplans']);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error updating dial plan:', err);
          this.errorMessage = `Failed to update dial plan: ${err.error?.message || err.message}`;
          this.isLoading = false;
        }
      });
    } else {
      this.dialPlanService.createDialPlan(finalDialPlan).subscribe({
        next: () => {
          this.router.navigate(['/dialplans']);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error creating dial plan:', err);
          this.errorMessage = `Failed to create dial plan: ${err.error?.message || err.message}`;
          this.isLoading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/dialplans']);
  }
}
