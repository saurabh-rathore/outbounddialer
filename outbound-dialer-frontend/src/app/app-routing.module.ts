import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CampaignListComponent } from './components/campaign-list/campaign-list.component';
import { CampaignFormComponent } from './components/campaign-form/campaign-form.component';
import { DialPlanListComponent } from './components/dial-plan-list/dial-plan-list.component';
import { DialPlanFormComponent } from './components/dial-plan-form/dial-plan-form.component'; // Added

const routes: Routes = [
  { path: 'campaigns', component: CampaignListComponent },
  { path: 'campaigns/new', component: CampaignFormComponent },
  { path: 'campaigns/edit/:id', component: CampaignFormComponent },
  { path: 'dialplans', component: DialPlanListComponent },
  { path: 'dialplans/new', component: DialPlanFormComponent }, // Added
  { path: 'dialplans/edit/:id', component: DialPlanFormComponent }, // Added
  { path: '', redirectTo: '/campaigns', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
