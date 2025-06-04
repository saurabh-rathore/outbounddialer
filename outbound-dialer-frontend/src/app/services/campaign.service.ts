import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Campaign {
  _id: string;
  name: string;
  dialPlanId?: string;
  phoneNumbers: string[];
  dndList: string[];
  startDate: string; // Using string for simplicity
  endDate: string;   // Using string for simplicity
  startTime: string; // Format HH:MM
  endTime: string;   // Format HH:MM
  status: 'idle' | 'running' | 'paused' | 'completed' | 'archived';
  createdAt?: string;
  updatedAt?: string;
  // Optional fields that might come from stats or other detailed views
  currentIndex?: number;
  callAttempts?: any[]; // Define more strictly if needed
}

export interface CampaignStats {
  totalNumbers: number;
  processedNumbers: number;
  successfulCalls: number;
  failedCalls: number;
  pendingRetries: number;
  dndBlockedCalls: number;
  currentIndex: number;
  campaignStatus: 'idle' | 'running' | 'paused' | 'completed' | 'archived';
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private apiUrl = '/api/campaigns'; // Using relative path for proxy

  constructor(private http: HttpClient) { }

  getCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(this.apiUrl);
  }

  getCampaign(id: string): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.apiUrl}/${id}`);
  }

  createCampaign(campaign: Partial<Campaign>): Observable<Campaign> {
    const payload = {
      ...campaign,
      phoneNumbers: campaign.phoneNumbers || [],
      dndList: campaign.dndList || []
    };
    return this.http.post<Campaign>(this.apiUrl, payload);
  }

  updateCampaign(id: string, campaign: Partial<Campaign>): Observable<Campaign> {
    const payload = {
      ...campaign,
      phoneNumbers: campaign.phoneNumbers || [],
      dndList: campaign.dndList || []
    };
    return this.http.put<Campaign>(`${this.apiUrl}/${id}`, payload);
  }

  deleteCampaign(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // State management methods
  startCampaign(id: string): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.apiUrl}/${id}/start`, {});
  }

  pauseCampaign(id: string): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.apiUrl}/${id}/pause`, {});
  }

  stopCampaign(id: string): Observable<Campaign> {
    return this.http.put<Campaign>(`${this.apiUrl}/${id}/stop`, {});
  }

  // Stats method
  getCampaignStats(id: string): Observable<CampaignStats> {
    return this.http.get<CampaignStats>(`${this.apiUrl}/${id}/stats`);
  }
}
