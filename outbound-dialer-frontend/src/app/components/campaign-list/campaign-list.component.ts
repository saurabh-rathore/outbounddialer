import { Component, OnInit, OnDestroy } from '@angular/core';
import { Campaign, CampaignService, CampaignStats } from '../../services/campaign.service'; // Adjusted path
import { Subscription, timer } from 'rxjs';
import { switchMap, takeWhile, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.component.html',
  styleUrls: ['./campaign-list.component.css']
})
export class CampaignListComponent implements OnInit, OnDestroy {
  campaigns: Campaign[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;

  campaignStatsMap: Map<number, CampaignStats> = new Map(); // Changed key type to number
  private pollingSubscriptions: Map<number, Subscription> = new Map(); // Changed key type to number

  constructor(private campaignService: CampaignService) { }

  ngOnInit(): void {
    this.loadCampaigns();
  }

  ngOnDestroy(): void {
    this.pollingSubscriptions.forEach(sub => sub.unsubscribe());
    this.pollingSubscriptions.clear();
  }

  loadCampaigns(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.campaignService.getCampaigns().subscribe({
      next: (data) => {
        this.campaigns = data;
        this.isLoading = false;

        // Create a Set of current campaign IDs for efficient lookup
        const currentCampaignIds = new Set(this.campaigns.map(c => c.id));

        // Stop polling for campaigns that are no longer present or no longer running
        this.pollingSubscriptions.forEach((_, campaignId) => { // campaignId is now number
            const campaign = this.campaigns.find(c => c.id === campaignId); // Use .id
            if (!campaign || campaign.status !== 'running') {
                this.stopPollingStats(campaignId);
            }
        });

        // Start polling for newly loaded running campaigns
        this.campaigns.forEach(campaign => {
          if (campaign.status === 'running') {
            this.startPollingStats(campaign.id); // Use .id
          }
        });
      },
      error: (err) => {
        console.error('Error fetching campaigns', err);
        this.errorMessage = 'Failed to load campaigns. Please ensure the backend is running and accessible.';
        this.isLoading = false;
      }
    });
  }

  private updateLocalCampaign(updatedCampaign: Campaign): void {
    const index = this.campaigns.findIndex(c => c.id === updatedCampaign.id); // Use .id
    if (index !== -1) {
      this.campaigns[index] = updatedCampaign;

      if (updatedCampaign.status === 'running') {
        this.startPollingStats(updatedCampaign.id); // Use .id
      } else {
        this.stopPollingStats(updatedCampaign.id); // Use .id
        if (updatedCampaign.status === 'completed' || updatedCampaign.status === 'paused' || updatedCampaign.status === 'idle') {
          // Fetch stats one last time if campaign is no longer running but might have final stats
          this.campaignService.getCampaignStats(updatedCampaign.id).subscribe(stats => { // Use .id
            this.campaignStatsMap.set(updatedCampaign.id, stats); // Use .id
          });
        } else {
             this.campaignStatsMap.delete(updatedCampaign.id); // Use .id
        }
      }
    }
  }

  startPollingStats(campaignId: number): void { // Changed campaignId to number
    if (this.pollingSubscriptions.has(campaignId)) {
      return;
    }
    const pollSub = timer(0, 10000)
      .pipe(
        takeWhile(() => {
          const campaign = this.campaigns.find(c => c.id === campaignId); // Use .id
          return !!campaign && campaign.status === 'running';
        }),
        switchMap(() => this.campaignService.getCampaignStats(campaignId)),
        catchError(error => {
          console.error(`Error polling stats for campaign ID ${campaignId}:`, error);
          this.stopPollingStats(campaignId);
          return [];
        })
      )
      .subscribe(stats => {
        this.campaignStatsMap.set(campaignId, stats);
      });
    this.pollingSubscriptions.set(campaignId, pollSub);
  }

  stopPollingStats(campaignId: number): void { // Changed campaignId to number
    if (this.pollingSubscriptions.has(campaignId)) {
      this.pollingSubscriptions.get(campaignId)!.unsubscribe();
      this.pollingSubscriptions.delete(campaignId);
      console.log(`Stopped polling stats for campaign ID ${campaignId}`);
    }
  }

  // deleteCampaign is called by deleteCampaignWrapper
  private deleteCampaignInternal(id: number): void { // Changed id to number, made private
    this.campaignService.deleteCampaign(id).subscribe({
      next: () => {
        this.stopPollingStats(id);
        this.campaignStatsMap.delete(id);
        this.campaigns = this.campaigns.filter(campaign => campaign.id !== id); // Use .id
      },
      error: (err) => {
        console.error('Error deleting campaign', err);
        this.errorMessage = `Failed to delete campaign: ${err.error?.message || err.message}`;
      }
    });
  }

  // Wrapper for delete confirmation, called from template
  deleteCampaignWrapper(id: number, name: string): void { // Changed id to number
    if (!id) { // Added check for id, though type system helps
      console.error('Cannot delete campaign with undefined or null id');
      return;
    }
    if (confirm(`Are you sure you want to delete campaign "${name}"?`)) { // Name is still string
      this.deleteCampaignInternal(id);
    }
  }

  onStartCampaign(id: number): void { // Changed id to number
    this.campaignService.startCampaign(id).subscribe({
      next: (updatedCampaign) => this.updateLocalCampaign(updatedCampaign),
      error: (err) => {
        console.error('Error starting campaign', err);
        this.errorMessage = `Failed to start campaign: ${err.error?.message || err.message}`;
      }
    });
  }

  onPauseCampaign(id: number): void { // Changed id to number
    this.campaignService.pauseCampaign(id).subscribe({
      next: (updatedCampaign) => this.updateLocalCampaign(updatedCampaign),
      error: (err) => {
        console.error('Error pausing campaign', err);
        this.errorMessage = `Failed to pause campaign: ${err.error?.message || err.message}`;
      }
    });
  }

  onStopCampaign(id: number): void { // Changed id to number
    this.campaignService.stopCampaign(id).subscribe({
      next: (updatedCampaign) => this.updateLocalCampaign(updatedCampaign),
      error: (err) => {
        console.error('Error stopping campaign', err);
        this.errorMessage = `Failed to stop campaign: ${err.error?.message || err.message}`;
      }
    });
  }
}
