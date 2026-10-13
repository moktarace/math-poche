export function download(bytes:Uint8Array|string,filename:string,type:string):void{
 const blob=new Blob([typeof bytes==='string'?bytes:bytes.slice().buffer as ArrayBuffer],{type});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
