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

  campaignStatsMap: Map<string, CampaignStats> = new Map();
  private pollingSubscriptions: Map<string, Subscription> = new Map();

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
        // Stop polling for campaigns that are no longer present or no longer running
        this.pollingSubscriptions.forEach((_, campaignId) => {
            const campaign = this.campaigns.find(c => c._id === campaignId);
            if (!campaign || campaign.status !== 'running') {
                this.stopPollingStats(campaignId);
            }
        });
        // Start polling for newly loaded running campaigns
        this.campaigns.forEach(campaign => {
          if (campaign.status === 'running') {
            this.startPollingStats(campaign._id);
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
    const index = this.campaigns.findIndex(c => c._id === updatedCampaign._id);
    if (index !== -1) {
      this.campaigns[index] = updatedCampaign;
      // this.campaigns = [...this.campaigns]; // To force change detection if needed

      // Manage polling based on new status
      if (updatedCampaign.status === 'running') {
        this.startPollingStats(updatedCampaign._id);
      } else {
        this.stopPollingStats(updatedCampaign._id);
         // If campaign is completed or paused, fetch stats one last time
        if (updatedCampaign.status === 'completed' || updatedCampaign.status === 'paused' || updatedCampaign.status === 'idle') {
          this.campaignService.getCampaignStats(updatedCampaign._id).subscribe(stats => {
            this.campaignStatsMap.set(updatedCampaign._id, stats);
          });
        } else {
             this.campaignStatsMap.delete(updatedCampaign._id); // Or keep last known stats
        }
      }
    }
  }

  startPollingStats(campaignId: string): void {
    if (this.pollingSubscriptions.has(campaignId)) {
      return; // Already polling
    }
    const pollSub = timer(0, 10000) // Poll every 10 seconds, start immediately
      .pipe(
        takeWhile(() => {
          const campaign = this.campaigns.find(c => c._id === campaignId);
          return !!campaign && campaign.status === 'running'; // Continue while campaign exists and is running
        }),
        switchMap(() => this.campaignService.getCampaignStats(campaignId)),
        catchError(error => {
          console.error(`Error polling stats for ${campaignId}:`, error);
          this.stopPollingStats(campaignId); // Stop on error
          // Optionally show a user-facing error message for this specific campaign's stats
          return []; // Return an empty observable to prevent the main stream from erroring out
        })
      )
      .subscribe(stats => {
        this.campaignStatsMap.set(campaignId, stats);
      });
    this.pollingSubscriptions.set(campaignId, pollSub);
  }

  stopPollingStats(campaignId: string): void {
    if (this.pollingSubscriptions.has(campaignId)) {
      this.pollingSubscriptions.get(campaignId)!.unsubscribe();
      this.pollingSubscriptions.delete(campaignId);
      console.log(`Stopped polling stats for campaign ${campaignId}`);
      // Optionally, decide if you want to remove the stats from the map or keep the last known value.
      // For now, keeping them. If a campaign becomes non-running, its final stats might still be relevant.
      // If you want to clear them: this.campaignStatsMap.delete(campaignId);
    }
  }

  deleteCampaign(id: string): void {
    if (!id) {
      console.error('Cannot delete campaign with undefined or null id');
      return;
    }
    if (confirm('Are you sure you want to delete this campaign?')) {
      this.campaignService.deleteCampaign(id).subscribe({
        next: () => {
          this.stopPollingStats(id); // Stop polling if it was running
          this.campaignStatsMap.delete(id); // Remove its stats
          this.campaigns = this.campaigns.filter(campaign => campaign._id !== id);
        },
        error: (err) => {
          console.error('Error deleting campaign', err);
          this.errorMessage = `Failed to delete campaign: ${err.error?.message || err.message}`;
        }
      });
    }
  }

  onStartCampaign(id: string): void {
    this.campaignService.startCampaign(id).subscribe({
      next: (updatedCampaign) => this.updateLocalCampaign(updatedCampaign),
      error: (err) => {
        console.error('Error starting campaign', err);
        this.errorMessage = `Failed to start campaign: ${err.error?.message || err.message}`;
      }
    });
  }

  onPauseCampaign(id: string): void {
    this.campaignService.pauseCampaign(id).subscribe({
      next: (updatedCampaign) => this.updateLocalCampaign(updatedCampaign),
      error: (err) => {
        console.error('Error pausing campaign', err);
        this.errorMessage = `Failed to pause campaign: ${err.error?.message || err.message}`;
      }
    });
  }

  onStopCampaign(id: string): void {
    this.campaignService.stopCampaign(id).subscribe({
      next: (updatedCampaign) => this.updateLocalCampaign(updatedCampaign),
      error: (err) => {
        console.error('Error stopping campaign', err);
        this.errorMessage = `Failed to stop campaign: ${err.error?.message || err.message}`;
      }
    });
  }
}
