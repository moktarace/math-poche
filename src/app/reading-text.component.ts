import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatReading } from './reading-format';

@Component({
  selector: 'app-reading-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reading-prose">
      @for (block of blocks(); track $index) {
        @switch (block.kind) {
          @case ('heading') { <h3 class="reading-heading">{{block.text}}</h3> }
          @case ('step') {
            <h4 class="reading-step"><span>{{block.label}}</span>{{block.text}}</h4>
          }
          @case ('objective') {
            <div class="reading-objective"><strong>{{block.label}}</strong><p>{{block.text}}</p></div>
          }
          @case ('list') {
            <ul class="reading-list">@for(item of block.items; track $index){<li>{{item}}</li>}</ul>
          }
          @default { <p>{{block.text}}</p> }
        }
      }
    </div>
  `
})
export class ReadingTextComponent {
  text = input('');
  blocks = computed(() => formatReading(this.text()));
}
