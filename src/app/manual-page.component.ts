import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ManualPage } from './models';
import { ReadingTextComponent } from './reading-text.component';

@Component({
 selector: 'app-manual-page', standalone: true,
 imports: [ReadingTextComponent], changeDetection: ChangeDetectionStrategy.OnPush,
 template: `
 <article class="manual-document" [attr.data-theme]="page().theme">
  <h3 class="manual-document-title">{{page().title}}</h3>
  @for(section of page().sections;track $index){
   <section class="manual-lesson" [attr.data-theme]="section.theme">
    <h4 class="manual-lesson-title">{{section.title}}</h4>
    <div class="manual-lesson-layout" [class.has-materials]="section.materials.length">
     @if(section.materials.length){<aside class="manual-materials"><h5>Matériel</h5>@for(material of section.materials;track $index){<app-reading-text [text]="material" />}</aside>}
     <div class="manual-lesson-body">
      @for(block of section.blocks;track $index){
       @switch(block.kind){
        @case('heading'){<h5 class="manual-rubric">{{block.text}}</h5>}
        @case('step'){<h6 class="manual-step">{{block.text}}</h6>}
        @case('objective'){<p class="manual-lesson-objective">{{block.text}}</p>}
        @case('item'){<div class="manual-bullet"><span aria-hidden="true">•</span><p>{{block.text}}</p></div>}
        @case('quote'){<p class="manual-quote">{{block.text}}</p>}
        @case('table'){<div class="manual-day-table">@for(column of block.columns;track $index){<div><app-reading-text [text]="column" /></div>}</div>}
        @default{<p>{{block.text}}</p>}
       }
      }
     </div>
    </div>
   </section>
  }
 </article>
 `
})
export class ManualPageComponent { page=input.required<ManualPage>(); }
