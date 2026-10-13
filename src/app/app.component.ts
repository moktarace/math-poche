import { Component, signal, computed, inject, HostListener, ElementRef, ViewChild, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { SwUpdate } from '@angular/service-worker';
import { IconComponent } from './icon.component';
import { ReadingTextComponent } from './reading-text.component';
import { ManualOverviewComponent } from './manual-overview.component';
import { ManualPageComponent } from './manual-page.component';
import { Catalog, GuidePage, Sequence, Preparation, LocalData } from './models';
import { download } from './file-download';
import { sequenceFlow } from './export-model';
type View='library'|'guides'|'preparations'|'favorites'|'settings';
@Component({selector:'app-root',standalone:true,imports:[FormsModule,DatePipe,NgTemplateOutlet,IconComponent,ReadingTextComponent,ManualOverviewComponent,ManualPageComponent],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit {
 @ViewChild('detailDialog') dialog?:ElementRef<HTMLDialogElement>;
 @ViewChild('guideDialog') guideDialog?:ElementRef<HTMLDialogElement>;
 readonly sw=inject(SwUpdate);
 catalog=signal<Catalog|null>(null);loading=signal(true);error=signal('');view=signal<View>('library');
 level=signal('Tous');period=signal('Toutes');domain=signal('Tous');query=signal('');favorites=signal<string[]>([]);preparations=signal<Preparation[]>([]);
 selected=signal<Sequence|null>(null);detailTab=signal<'overview'|'read'|'edit'>('overview');draft:Preparation|null=null;
 guideLevel=signal('PS');pageNumber=signal(1);guidePages=signal<GuidePage[]>([]);readerLoading=signal(false);readerError=signal('');readerMode=signal<'text'|'original'>('text');
 online=signal(navigator.onLine);swReady=signal(false);updateReady=signal(false);installPrompt:any=null;
 toast=signal('');busy=signal(false);exportFormat=signal<'pdf'|'docx'|null>(null);offlineBusy=signal('');offlineProgress=signal(0);offlineAvailable=signal<string[]>([]);
 pendingDelete=signal('');lastSaved=signal('');pageCache=new Map<string,GuidePage[]>();toastTimer:ReturnType<typeof setTimeout>|null=null;
 domains=['Nombres','Formes','Espace','Grandeurs','Motifs'];
 navigation:{id:View;label:string;icon:string}[]=[{id:'library',label:'Les séquences',icon:'grid'},{id:'guides',label:'Mes guides',icon:'book'},{id:'preparations',label:'Mes préparations',icon:'file'},{id:'favorites',label:'Mes favoris',icon:'heart'}];
 filtered=computed(()=>{const q=this.normalize(this.query());return (this.catalog()?.sequences||[]).filter(s=>(this.view()!=='favorites'||this.favorites().includes(s.id))&&(this.level()==='Tous'||s.level===this.level())&&(this.period()==='Toutes'||s.period===Number(this.period()))&&(this.domain()==='Tous'||s.domain===this.domain())&&(!q||this.normalize([s.title,s.domain,s.objectives,s.flow,s.materials,s.didactic].join(' ')).includes(q)));});
 sourceMatches=computed(()=>{const q=this.normalize(this.query());return q.length<2?[]:this.guidePages().filter(p=>this.normalize(p.text).includes(q));});
 currentPage=computed(()=>this.guidePages().find(p=>p.number===this.pageNumber()));
 pageSequence=computed(()=>this.catalog()?.sequences.find(s=>s.level===this.guideLevel() && s.start===this.pageNumber()));
 textSize=signal('normal');
 setTextSize(size:string){this.textSize.set(size);try{localStorage.setItem('maths-poche-reading-size',size);}catch{}}
 async ngOnInit(){this.restore();await this.load();
  try{const size=localStorage.getItem('maths-poche-reading-size');if(size&&['normal','large','extra'].includes(size))this.textSize.set(size);}catch{}
  if('serviceWorker' in navigator){navigator.serviceWorker.ready.then(()=>{this.swReady.set(true);this.checkOffline();}).catch(()=>{});}
  if(this.sw.isEnabled)this.sw.versionUpdates.subscribe(e=>{if(e.type==='VERSION_READY')this.updateReady.set(true);});
 }
 async load(){this.loading.set(true);this.error.set('');try{const r=await fetch('data/catalog.json');if(!r.ok)throw Error();this.catalog.set(await r.json());}catch{this.error.set('Impossible de charger la bibliothèque. Vérifiez votre connexion puis réessayez.');}finally{this.loading.set(false);}}
 normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
 @HostListener('window:online') onOnline(){this.online.set(true);}
 @HostListener('window:offline') onOffline(){this.online.set(false);}
 @HostListener('window:beforeinstallprompt',['$event']) onInstall(e:Event){e.preventDefault();this.installPrompt=e;}
 go(view:View){this.view.set(view);this.query.set('');window.scrollTo({top:0,behavior:'smooth'});}
 clearFilters(){this.level.set('Tous');this.period.set('Toutes');this.domain.set('Tous');this.query.set('');}
 notify(message:string){this.toast.set(message);if(this.toastTimer)clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toast.set(''),6000);}
 persist(){try{localStorage.setItem('maths-poche-v1',JSON.stringify({version:1,favorites:this.favorites(),preparations:this.preparations()}));return true;}catch{this.notify('Enregistrement impossible sur cet appareil. Exportez une sauvegarde pour conserver votre travail.');return false;}}
 restore(){try{const value=localStorage.getItem('maths-poche-v1');if(!value)return;const data=JSON.parse(value);if(!this.validBackup(data))throw Error();this.favorites.set(data.favorites);this.preparations.set(data.preparations);}catch{this.notify('La sauvegarde locale est illisible. Vous pouvez importer une sauvegarde depuis les réglages.');}}
 validBackup(value:unknown):value is LocalData {
  if(!value||typeof value!=='object')return false;const d=value as LocalData;
  const fields=['id','sequenceId','title','classroom','date','duration','objectives','materials','flow','differentiation','evaluation','notes','updatedAt'];
  return d.version===1&&Array.isArray(d.favorites)&&d.favorites.every(x=>typeof x==='string')&&Array.isArray(d.preparations)&&d.preparations.every(p=>p&&fields.every(f=>typeof (p as any)[f]==='string')&&p.title.length<2000&&Object.values(p).every(v=>typeof v!=='string'||v.length<100000));
 }
 toggleFavorite(s:Sequence,event?:Event){event?.stopPropagation();this.favorites.update(ids=>ids.includes(s.id)?ids.filter(id=>id!==s.id):[...ids,s.id]);this.persist();}
 isFavorite(s:Sequence){return this.favorites().includes(s.id);}
 openSequence(s:Sequence,tab:'overview'|'read'|'edit'='overview'){
  this.selected.set(s);this.detailTab.set(tab);this.draft=null;this.readerError.set('');this.pendingDelete.set('');
  this.dialog?.nativeElement.showModal();if(tab==='read')this.loadPages(s.level,s.start);if(tab==='edit')this.prepare();
 }
 readSequencePage(page:number){const s=this.selected();if(s){this.detailTab.set('read');this.loadPages(s.level,page);}}
 closeDetail(){this.dialog?.nativeElement.close();this.selected.set(null);this.draft=null;}
 chooseTab(tab:'overview'|'read'|'edit'){this.detailTab.set(tab);const s=this.selected();if(tab==='read'&&s)this.loadPages(s.level,s.start);if(tab==='edit')this.prepare();}
 async loadPages(level:string,page=1){this.guideLevel.set(level);this.pageNumber.set(page);this.readerLoading.set(true);this.readerError.set('');this.guidePages.set([]);try{if(!this.pageCache.has(level)){const r=await fetch(`data/${level.toLowerCase()}.json`);if(!r.ok)throw Error();this.pageCache.set(level,await r.json());}if(this.guideLevel()===level)this.guidePages.set(this.pageCache.get(level)!);}catch{this.readerError.set('Le texte de ce guide est indisponible. Réessayez lorsque la connexion sera rétablie.');}finally{this.readerLoading.set(false);}}
 openGuide(level:string,page=1){this.query.set('');this.guideDialog?.nativeElement.showModal();this.loadPages(level,page);}
 changePage(value:number){this.pageNumber.set(Math.min(108,Math.max(1,Number(value)||1)));this.readerError.set('');}
 prepare(){const s=this.selected();if(!s)return;this.detailTab.set('edit');const saved=this.preparations().find(p=>p.sequenceId===s.id);this.draft=saved?{...saved}:{id:crypto.randomUUID(),sequenceId:s.id,title:s.title,classroom:s.level,date:'',duration:'4 jours · ateliers en rotation',objectives:s.objectives,materials:s.materials,flow:sequenceFlow(s),differentiation:s.differentiation,evaluation:'',notes:'',updatedAt:new Date().toISOString()};if(!saved)this.saveDraft(false);}
 saveDraft(show=false){if(!this.draft)return;this.draft.updatedAt=new Date().toISOString();const draft={...this.draft};this.preparations.update(all=>[draft,...all.filter(p=>p.id!==draft.id)]);if(this.persist()){this.lastSaved.set(new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}));if(show)this.notify('Votre fiche est enregistrée sur cet appareil.');}}
 openPreparation(prep:Preparation){const s=this.catalog()?.sequences.find(s=>s.id===prep.sequenceId);if(s){this.openSequence(s,'edit');this.draft={...prep};}else this.notify('La séquence liée à cette fiche est absente de la bibliothèque.');}
 removePreparation(id:string){this.preparations.update(p=>p.filter(x=>x.id!==id));this.persist();this.pendingDelete.set('');this.notify('Préparation supprimée.');}
 async exportFiche(format:'pdf'|'docx'='pdf'){
  if(!this.draft||!this.selected()||this.busy())return;
  this.saveDraft();const draft={...this.draft},sequence=this.selected()!;
  this.busy.set(true);this.exportFormat.set(format);
  try{
   if(format==='docx'){const {exportPreparationDocx}=await import('./docx-export');await exportPreparationDocx(draft,sequence);}
   else{const {exportPreparation}=await import('./pdf-export');await exportPreparation(draft,sequence);}
   this.notify(format==='docx'?'Votre fiche Word modifiable est prête.':'Votre fiche PDF est prête.');
  }catch{this.notify(`L’export ${format==='docx'?'Word':'PDF'} a échoué. Votre fiche reste enregistrée sur cet appareil. Réessayez après le chargement complet de l’application.`);}
  finally{this.busy.set(false);this.exportFormat.set(null);}
 }
 async exportOriginal(){const s=this.selected();if(!s)return;this.busy.set(true);try{const {exportSourcePages}=await import('./pdf-export');await exportSourcePages(s);this.notify('Les 6 pages originales ont été exportées.');}catch{this.notify('Le PDF original n’est pas disponible. Téléchargez le guide depuis Mes guides lorsque vous êtes en ligne.');}finally{this.busy.set(false);}}
 exportBackup(){download(JSON.stringify({version:1,favorites:this.favorites(),preparations:this.preparations()},null,2),`maths-en-poche-${new Date().toISOString().slice(0,10)}.json`,'application/json');}
 async importBackup(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;try{if(file.size>10000000)throw Error();const data=JSON.parse(await file.text());if(!this.validBackup(data))throw Error();this.favorites.update(ids=>[...new Set([...ids,...data.favorites])]);this.preparations.update(existing=>{const map=new Map(existing.map(p=>[p.id,p]));for(const p of data.preparations){const prev=map.get(p.id);if(!prev||p.updatedAt>prev.updatedAt)map.set(p.id,p);}return [...map.values()];});if(this.persist())this.notify('Sauvegarde importée et fusionnée avec vos préparations.');}catch{this.notify('Fichier invalide. Choisissez une sauvegarde JSON créée par Maths en poche.');}input.value='';}
 async install(){if(this.installPrompt){await this.installPrompt.prompt();this.installPrompt=null;}else this.go('settings');}
 async checkOffline(){const available=[];for(const level of ['PS','MS']){const paths=[`guides/${level.toLowerCase()}.pdf`,...Array.from({length:108},(_,i)=>`pages/${level.toLowerCase()}/${i+1}.webp`)];let all=true;for(const p of paths){if(!await caches.match(new URL(p,document.baseURI).href)){all=false;break;}}if(all)available.push(level);}this.offlineAvailable.set(available);}
 async downloadGuide(level:string){if(this.offlineBusy())return;if(!navigator.serviceWorker?.controller){this.notify('Le mode hors connexion se prépare. Rechargez la page dans quelques secondes, puis réessayez.');return;}this.offlineBusy.set(level);this.offlineProgress.set(0);try{const paths=[`guides/${level.toLowerCase()}.pdf`,...Array.from({length:108},(_,i)=>`pages/${level.toLowerCase()}/${i+1}.webp`)];let done=0;for(let i=0;i<paths.length;i+=4){await Promise.all(paths.slice(i,i+4).map(async p=>{const r=await fetch(p);if(!r.ok)throw Error();await r.arrayBuffer();this.offlineProgress.set(Math.round(++done/paths.length*100));}));}await this.checkOffline();if(!this.offlineAvailable().includes(level))throw Error();await navigator.storage?.persist?.();this.notify(`Le guide ${level} est disponible hors connexion, images et PDF compris.`);}catch{this.notify('Téléchargement incomplet. Vérifiez la connexion et l’espace disponible, puis réessayez.');}finally{this.offlineBusy.set('');}}
 excerpt(text:string){const q=this.normalize(this.query());const idx=q?this.normalize(text).indexOf(q):0;const start=Math.max(0,idx-55);return (start?'…':'')+text.slice(start,start+180).replace(/\n/g,' ')+'…';}
 reload(){location.reload();}
}
