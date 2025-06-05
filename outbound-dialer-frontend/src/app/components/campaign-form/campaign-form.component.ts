import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Campaign, CampaignService } from '../../services/campaign.service';

@Component({
  selector: 'app-campaign-form',
  templateUrl: './campaign-form.component.html',
  styleUrls: ['./campaign-form.component.css']
})
export class CampaignFormComponent implements OnInit {
  campaign: Partial<Campaign> = { // id will be undefined for new campaigns
    name: '',
    dialPlanId: '',
    phoneNumbers: [],
    dndList: [],
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    status: 'idle'
  };

  isEditMode: boolean = false;
  isLoading: boolean = false;
  errorMessage: string | null = null; // Changed to allow null for cleaner checks
  pageTitle: string = 'Create Campaign'; // Added for dynamic title in template if needed

  phoneNumbersText: string = '';
  dndListText: string = '';

  constructor(
    private campaignService: CampaignService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.pageTitle = 'Edit Campaign';
      this.isLoading = true;
      const numericId = +idParam; // Convert string idParam to number

      if (isNaN(numericId)) {
        console.error('Invalid campaign ID in route:', idParam);
        this.errorMessage = 'Invalid campaign ID provided in the URL.';
        this.isLoading = false;
        return;
      }

      this.campaignService.getCampaign(numericId).subscribe({ // Use numericId
        next: (data) => {
          data.startDate = this.formatDateForInput(data.startDate);
          data.endDate = this.formatDateForInput(data.endDate);
          this.campaign = data;

          this.phoneNumbersText = this.campaign.phoneNumbers ? this.campaign.phoneNumbers.join('\n') : '';
          this.dndListText = this.campaign.dndList ? this.campaign.dndList.join('\n') : '';

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching campaign for edit', err);
          this.errorMessage = `Failed to load campaign data: ${err.error?.message || err.message}`;
          this.isLoading = false;
        }
      });
    } else {
        // For new campaign, ensure default values are set if any specific logic needed
        // This is already handled by campaign property initialization.
    }
  }

  private formatDateForInput(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
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
      return '';
    }
  }

  saveCampaign(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const payload: Partial<Campaign> = {
      ...this.campaign,
      phoneNumbers: this.phoneNumbersText.split('\n').map(n => n.trim()).filter(n => n.length > 0),
      dndList: this.dndListText.split('\n').map(n => n.trim()).filter(n => n.length > 0),
    };

    if (!payload.startDate) delete payload.startDate; // Or handle as error if required by backend always
    if (!payload.endDate) delete payload.endDate;   // Or handle as error

    if (this.isEditMode && payload.id) { // Check for payload.id (number)
      this.campaignService.updateCampaign(payload.id, payload).subscribe({ // Use payload.id (number)
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
      // Ensure id is not part of the payload for create
      const { id, ...createPayload } = payload;
      this.campaignService.createCampaign(createPayload).subscribe({
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
