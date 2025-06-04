import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Campaign, CampaignService } from '../../services/campaign.service';

@Component({
  selector: 'app-campaign-form',
  templateUrl: './campaign-form.component.html',
  styleUrls: ['./campaign-form.component.css']
})
export class CampaignFormComponent implements OnInit {
  // Use Partial<Campaign> for the form model to allow _id to be initially undefined for new campaigns
  campaign: Partial<Campaign> = {
    name: '',
    dialPlanId: '',
    phoneNumbers: [], // Will be populated from phoneNumbersText
    dndList: [],      // Will be populated from dndListText
    startDate: '',    // Initialize as empty string for date input
    endDate: '',      // Initialize as empty string for date input
    startTime: '09:00',
    endTime: '17:00',
    status: 'idle'
  };

  isEditMode: boolean = false;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  // Separate string properties for textarea binding
  phoneNumbersText: string = '';
  dndListText: string = '';

  constructor(
    private campaignService: CampaignService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.isLoading = true;
      this.campaignService.getCampaign(id).subscribe({
        next: (data) => {
          // Format dates for input[type="date"] which expects YYYY-MM-DD
          data.startDate = this.formatDateForInput(data.startDate);
          data.endDate = this.formatDateForInput(data.endDate);
          this.campaign = data;

          // Populate textarea helper properties
          this.phoneNumbersText = this.campaign.phoneNumbers ? this.campaign.phoneNumbers.join('\n') : '';
          this.dndListText = this.campaign.dndList ? this.campaign.dndList.join('\n') : '';

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching campaign for edit', err);
          this.errorMessage = 'Failed to load campaign data.';
          this.isLoading = false;
        }
      });
    }
  }

  private formatDateForInput(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      // Check if date is valid
      if (isNaN(date.getTime())) {
          // Try to parse if it's already in YYYY-MM-DD format (e.g. from backend)
          const parts = dateStr.split('T')[0].split('-');
          if (parts.length === 3) return dateStr.split('T')[0];
          return '';
      }
      const year = date.getFullYear();
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error("Error formatting date:", dateStr, e);
      return ''; // Return empty or original if formatting fails
    }
  }

  saveCampaign(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Prepare payload by converting textarea strings to arrays
    const payload: Partial<Campaign> = {
      ...this.campaign,
      phoneNumbers: this.phoneNumbersText.split('\n').map(n => n.trim()).filter(n => n.length > 0),
      dndList: this.dndListText.split('\n').map(n => n.trim()).filter(n => n.length > 0),
    };
    // Ensure dates are not empty strings if they are optional or handle as needed by backend
    if (!payload.startDate) delete payload.startDate;
    if (!payload.endDate) delete payload.endDate;


    if (this.isEditMode && payload._id) {
      this.campaignService.updateCampaign(payload._id, payload).subscribe({
        next: () => {
          this.router.navigate(['/campaigns']);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error updating campaign', err);
          this.errorMessage = `Failed to update campaign: ${err.error?.message || err.message}`;
          this.isLoading = false;
        }
      });
    } else {
      // Remove _id for create operation if it somehow exists
      delete payload._id;
      this.campaignService.createCampaign(payload).subscribe({
        next: () => {
          this.router.navigate(['/campaigns']);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error creating campaign', err);
          this.errorMessage = `Failed to create campaign: ${err.error?.message || err.message}`;
          this.isLoading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/campaigns']);
  }
}
