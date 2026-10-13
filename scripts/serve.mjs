import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.pdf':'application/pdf'};
const port=Number(process.env.PORT||4200);
http.createServer(async(req,res)=>{
 try {
 let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let file=path.resolve(root,'.'+url);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
 if(file===root)file=path.join(root,'index.html');
 try{if(!(await stat(file)).isFile())throw Error();}catch{if(path.extname(file)){res.writeHead(404).end();return;}file=path.join(root,'index.html');}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(await readFile(file));
 }catch{res.writeHead(500).end();}
}).listen(port,'0.0.0.0',()=>console.log(`Local: http://localhost:${port}`));
