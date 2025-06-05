import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Campaign {
  id: number; // Changed from _id: string
  name: string;
  dialPlanId?: string; // This might become number if we make DialPlan ID numeric and associate
  phoneNumbers: string[];
  dndList: string[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'archived';
  createdAt?: string;
  updatedAt?: string;
  currentIndex?: number;
  callAttempts?: any[];
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
  private apiUrl = '/api/campaigns';

  constructor(private http: HttpClient) { }

  getCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(this.apiUrl);
  }

  getCampaign(id: number): Observable<Campaign> { // Changed id to number
    return this.http.get<Campaign>(`${this.apiUrl}/${id}`);
  }

  createCampaign(campaign: Partial<Campaign>): Observable<Campaign> {
    // If 'id' is part of Partial<Campaign> and is number, it's fine.
    // Backend should ignore ID on create.
    const { id, ...campaignData } = campaign; // Ensure id is not sent on create
    const payload = {
      ...campaignData,
      phoneNumbers: campaignData.phoneNumbers || [],
      dndList: campaignData.dndList || []
    };
    return this.http.post<Campaign>(this.apiUrl, payload);
  }

  updateCampaign(id: number, campaign: Partial<Campaign>): Observable<Campaign> { // Changed id to number
    const payload = {
      ...campaign,
      phoneNumbers: campaign.phoneNumbers || [],
      dndList: campaign.dndList || []
    };
    return this.http.put<Campaign>(`${this.apiUrl}/${id}`, payload);
  }

  deleteCampaign(id: number): Observable<any> { // Changed id to number
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // State management methods
  startCampaign(id: number): Observable<Campaign> { // Changed id to number
    return this.http.put<Campaign>(`${this.apiUrl}/${id}/start`, {});
  }

  pauseCampaign(id: number): Observable<Campaign> { // Changed id to number
    return this.http.put<Campaign>(`${this.apiUrl}/${id}/pause`, {});
  }

  stopCampaign(id: number): Observable<Campaign> { // Changed id to number
    return this.http.put<Campaign>(`${this.apiUrl}/${id}/stop`, {});
  }

  // Stats method
  getCampaignStats(id: number): Observable<CampaignStats> { // Changed id to number
    return this.http.get<CampaignStats>(`${this.apiUrl}/${id}/stats`);
  }
}
