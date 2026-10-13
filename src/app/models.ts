export interface Sequence { id:string; level:string; period:number; week:number; title:string; domain:string; start:number; end:number; objectives:string; summary:string; didactic:string; materials:string; flow:string; differentiation:string; warning:string; manual?:ManualOverview; }
export interface Source {level:string;pages:number;file:string;name:string;publisher:string;year:number;}
export interface Catalog {version:number;sources:Source[];sequences:Sequence[];}
export interface GuidePage {number:number;text:string;image:string;manual?:ManualPage;}
export interface Preparation { id:string; sequenceId:string; title:string; classroom:string; date:string; duration:string; objectives:string; materials:string; flow:string; differentiation:string; evaluation:string; notes:string; updatedAt:string; }
export interface LocalData {version:1;favorites:string[];preparations:Preparation[];}

export interface ManualOverview {
 rituals:string[];
 days:{number:number;title:string}[];
 workshops:{label:string;title:string;objective:string;note?:string}[];
 mathCorner:{title:string;objective:string};
}
export interface ManualBlock {kind:'paragraph'|'quote'|'heading'|'step'|'objective'|'item'|'table';text?:string;columns?:string[];}
export interface ManualPage {title:string;theme:string;sections:{title:string;theme:string;blocks:ManualBlock[];materials:string[]}[];}
