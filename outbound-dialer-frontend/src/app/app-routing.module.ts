import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CampaignListComponent } from './components/campaign-list/campaign-list.component';
import { CampaignFormComponent } from './components/campaign-form/campaign-form.component'; // Added

const routes: Routes = [
  { path: 'campaigns', component: CampaignListComponent },
  { path: 'campaigns/new', component: CampaignFormComponent }, // Added
  { path: 'campaigns/edit/:id', component: CampaignFormComponent }, // Added
  { path: '', redirectTo: '/campaigns', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
