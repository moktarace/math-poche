import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Sequence } from './models';
import { ReadingTextComponent } from './reading-text.component';

@Component({
 selector: 'app-manual-overview', standalone: true,
 imports: [ReadingTextComponent], changeDetection: ChangeDetectionStrategy.OnPush,
 template: `
 @if(sequence(); as s){
 <article class="manual-overview" aria-label="La semaine selon le manuel">
  <div class="manual-intro">
   <header class="manual-title-row">
    <div class="manual-period"><span>Période</span><strong>{{s.period}}</strong><b>Semaine {{s.week}}</b></div>
    <div class="manual-title"><span class="manual-level">{{s.level === 'PS' ? 'Petite section' : 'Moyenne section'}}</span><h3>{{s.title}}</h3><div class="manual-objectives"><strong>Objectifs d’apprentissage</strong><ul>@for(goal of objectives();track $index){<li>{{goal}}</li>}</ul></div></div>
   </header>
   <section class="manual-teacher"><h4>Le coin de l’enseignant·e</h4><app-reading-text [text]="s.didactic" /></section>
  </div>
  <h3 class="manual-week-title">La semaine en un coup d’œil</h3>
  @if(s.manual;as m){
   <div class="manual-week-grid">
    <section class="manual-panel manual-rituals"><h4>Rituels</h4><ul>@for(ritual of m.rituals;track $index){<li>{{ritual}}</li>}</ul><button class="manual-link" (click)="openPage.emit(s.start+1)">Lire les rituels <span aria-hidden="true">→</span></button></section>
    <section class="manual-panel manual-collective"><h4>Activités en classe entière</h4><ol class="manual-days">@for(day of m.days;track day.number){<li><button (click)="openPage.emit(s.start+2)"><span>Jour {{day.number}}</span><strong>{{day.title}}</strong></button></li>}</ol></section>
    <section class="manual-panel manual-workshops"><h4>Ateliers</h4>@for(workshop of m.workshops;track $index){<div class="manual-workshop"><button (click)="openPage.emit(s.start+(workshop.label==='Dirigé'?3:['Mon cahier de maths','Autonome 2'].includes(workshop.label)?5:4))"><span class="manual-role">{{workshop.label}}</span><strong>{{workshop.title}}</strong></button><p><b>Objectif :</b> {{workshop.objective}}</p>@if(workshop.note){<small class="manual-workshop-note">{{workshop.note}}</small>}</div>}</section>
    <section class="manual-panel manual-maths"><h4>Le coin maths</h4><button class="manual-corner-title" (click)="openPage.emit(s.start+5)">{{m.mathCorner.title}}</button><p><b>Objectif :</b> {{m.mathCorner.objective}}</p></section>
   </div>
  }
  <footer class="manual-page-number"><span>{{s.start}}</span><small>Outils pour les Maths {{s.level}} · Magnard</small></footer>
 </article>
 }
 `
})
export class ManualOverviewComponent {
 sequence=input.required<Sequence>();
 openPage=output<number>();
 objectives=computed(()=>this.sequence().objectives.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ÿ])/).filter(Boolean));
}
