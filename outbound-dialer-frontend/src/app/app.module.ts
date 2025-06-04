import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // Added this line

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CampaignListComponent } from './components/campaign-list/campaign-list.component';
import { CampaignFormComponent } from './components/campaign-form/campaign-form.component';

@NgModule({
  declarations: [
    AppComponent,
    CampaignListComponent,
    CampaignFormComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule // Added this line
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
