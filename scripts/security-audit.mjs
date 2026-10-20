import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Run only against the disposable database/API from reservation-audit.mjs.
export async function auditSecurity(root, db, proof) {
 const call=async(method,path,body,token)=>{const r=await fetch(root+path,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:await r.json(),headers:r.headers,cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const source=readFileSync('apps/api/src/server.ts','utf8');
 const routes=[...source.matchAll(/app\.(get|post|patch|delete)(?:<[^\n]*?>)?\('([^']*\/api\/admin\/[^']+)'/g)].filter(m=>m[2]!=='/api/admin/login');
 assert.ok(routes.length>=18);
 for(const [,method,path] of routes){for(const token of [undefined,'tampered-token']){const r=await call(method.toUpperCase(),path.replace(/:id/g,'missing'),['get','delete'].includes(method)?undefined:{},token);assert.equal(r.status,401,`${method} ${path}`);assert.match(r.headers.get('cache-control'),/no-store/);}}
 const login=await call('POST','/api/admin/login',{pin:'123456'});assert.equal(login.status,200);const auth=login.data.token;
 const spec={title:'Security fixture',slug:'security-fixture',description:'Only local test',prizes:Array.from({length:10},(_,i)=>'Premio '+(i+1)),prizeSources:Array(10).fill(0),numberCount:100,priceCrc:2000,packages:[{quantity:2,priceCrc:3000}]};
 const created=await call('POST','/api/admin/campaigns',spec,auth);assert.equal(created.status,201);assert.equal(created.data.prizes.length,10);const id=created.data.id;
 const duplicate=await call('POST','/api/admin/campaigns',spec,auth);assert.equal(duplicate.status,409);assert.ok(!JSON.stringify(duplicate.data).match(/Prisma|INSERT|node_modules|schema/i));
 assert.equal((await call('POST','/api/admin/campaigns/'+id+'/finish-test',{},auth)).status,409);
 assert.equal((await db.campaign.findUnique({where:{id}})).status,'DRAFT');
 const larger={...spec,prizes:Array.from({length:20},(_,i)=>'Premio '+(i+1)),prizeSources:Array(20).fill(0)};
 assert.equal((await call('PATCH','/api/admin/campaigns/'+id,larger,auth)).status,200);
 assert.equal((await call('POST','/api/admin/campaigns/'+id+'/publish',{},auth)).status,200);
 assert.equal((await call('PATCH','/api/admin/campaigns/'+id,larger,auth)).status,400);
 assert.equal((await call('POST','/api/admin/campaigns/'+id+'/winner',{position:1,numberValue:0},auth)).status,409);
 const selection=await call('POST','/api/campaigns/security-fixture/proposal',{quantity:2,values:[0,1]});assert.equal(selection.status,200);
 const order={campaignId:id,values:[0,1],buyerName:'Security fixture',buyerEmail:'security@example.invalid',buyerPhone:'00000000',totalCrc:1};
 assert.equal((await call('POST','/api/reservations',order)).status,409);
 const r=await fetch(root+'/api/reservations',{method:'POST',headers:{'Content-Type':'application/json',Cookie:selection.cookie},body:JSON.stringify(order)});assert.equal(r.status,201);const receipt=await r.json();assert.equal(receipt.totalCrc,3000);
 const lookup=await call('POST','/api/reservations/lookup',{token:receipt.token});assert.equal(lookup.status,200);for(const key of ['buyerEmail','buyerPhone','lookupToken','proofs'])assert.ok(!(key in lookup.data));
 assert.equal((await call('POST','/api/reservations/lookup',{token:"' OR 1=1 --"})).status,404);
 assert.equal((await call('POST','/api/reservations/'+receipt.token+'/proofs',{mimeType:'image/png',base64:Buffer.from('<script>alert(1)</script>').toString('base64')})).status,400);
 assert.equal((await call('POST','/api/reservations/'+receipt.token+'/proofs',proof)).status,201);
 const stored=await db.reservation.findUnique({where:{lookupToken:receipt.token}});
 assert.equal((await call('POST','/api/admin/reservations/'+stored.id+'/reject',{reason:''},auth)).status,400);
 assert.equal((await call('POST','/api/admin/reservations/'+stored.id+'/reject',{reason:'Comprobante de prueba rechazado'},auth)).status,200);
 assert.equal((await call('POST','/api/admin/reservations/'+stored.id+'/confirm',{},auth)).status,409);
 assert.equal(await db.emailNotification.count({where:{reservationId:stored.id,kind:'REJECTED'}}),1);
 assert.equal(await db.entryNumber.count({where:{campaignId:id,status:'AVAILABLE'}}),100);
 const publicNumbers=await call('GET','/api/campaigns/security-fixture/numbers');assert.ok(publicNumbers.data.numbers.every(n=>Object.keys(n).sort().join(',')==='status,value'));
 const headers=(await fetch(root+'/api/health')).headers;assert.equal(headers.get('x-frame-options'),'DENY');assert.equal(headers.get('x-content-type-options'),'nosniff');assert.match(headers.get('content-security-policy'),/frame-ancestors 'none'/);
 const cross=await fetch(root+'/api/health',{headers:{Origin:'https://untrusted.example'}});assert.notEqual(cross.headers.get('access-control-allow-origin'),'https://untrusted.example');
 for(let i=0;i<5;i++)assert.equal((await call('POST','/api/admin/login',{pin:'000000'})).status,401);
 assert.equal((await call('POST','/api/admin/login',{pin:'000000'})).status,429);
 console.log(JSON.stringify({security:'PASS',adminRoutes:routes.length,checks:['missing and forged credentials','private no-store','ten/twenty prizes create-edit-publish','immutable live rules','duplicate URL safe error','unsold winner rejected','selection theft rejected','server-side price','lookup privacy','injection string rejected','fake image rejected','rejection releases tickets once','public number privacy','security headers','foreign origin denied','PIN rate limit']}));
}
