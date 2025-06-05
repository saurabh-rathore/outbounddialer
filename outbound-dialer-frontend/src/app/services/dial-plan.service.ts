import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // Added HttpHeaders just in case, not strictly needed for this method
import { Observable } from 'rxjs';

export interface DialPlan {
  id: number;
  name: string;
  description?: string;
  configuration: any;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DialPlanService {
  private apiUrl = '/api/dialplans'; // Using relative path for proxy

  constructor(private http: HttpClient) { }

  getDialPlans(): Observable<DialPlan[]> {
    return this.http.get<DialPlan[]>(this.apiUrl);
  }

  getDialPlan(id: number): Observable<DialPlan> {
    return this.http.get<DialPlan>(`${this.apiUrl}/${id}`);
  }

  createDialPlan(dialPlan: Partial<DialPlan>): Observable<DialPlan> {
    return this.http.post<DialPlan>(this.apiUrl, dialPlan);
  }

  updateDialPlan(id: number, dialPlan: Partial<DialPlan>): Observable<DialPlan> {
    return this.http.put<DialPlan>(`${this.apiUrl}/${id}`, dialPlan);
  }

  deleteDialPlan(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  generateDialPlanConfig(id: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/${id}/generate`, { responseType: 'text' });
  }
}
