import {openSync, existsSync} from 'node:fs';
import EmbeddedPostgres from '../tmp/reservation-tests/node_modules/embedded-postgres/dist/index.js';
import {PrismaClient} from '@prisma/client';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const database=new EmbeddedPostgres({databaseDir:'./tmp/reservation-tests/data',user:'tester',password:'local-only',port:5546,persistent:true,onLog:()=>{},onError:()=>{}});
let api;let api2;let db;let requestNumber=0;
const root='http://127.0.0.1:4199';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function request(path,body,cookie='',auth='') {const response=await fetch((++requestNumber%2 ? root : 'http://127.0.0.1:4200')+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...(auth?{Authorization:'Bearer '+auth}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie};}
const proof={mimeType:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6eeIAAAAASUVORK5CYII='};
try {
 if (!existsSync('./tmp/reservation-tests/data/PG_VERSION')) await database.initialise();
 await database.start();const name='audit_'+Date.now();const client=database.getPgClient();await client.connect();await client.query(`CREATE DATABASE ${name} ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`);await client.end();
 const env={...process.env,DATABASE_URL:'postgresql://tester:local-only@127.0.0.1:5546/'+name,NODE_ENV:'test',PORT:'4199',ADMIN_PIN:'123456',ADMIN_TOKEN:'local-test-secret-longer-than-24-characters',RESEND_API_KEY:'',EMAIL_FROM:''};
 execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy'],{env,stdio:'pipe',windowsHide:true});
 db=new PrismaClient({datasourceUrl:env.DATABASE_URL});
 const campaign=await db.campaign.create({data:{title:'Local concurrency audit',slug:'local-audit',prize:'Local',priceCrc:2000,numberCount:100,numberWidth:2,status:'LIVE',packages:{create:[{quantity:1,priceCrc:2000},{quantity:2,priceCrc:3000}]},numbers:{create:Array.from({length:100},(_,value)=>({value}))}}});
 api=spawn(process.execPath,['apps/api/dist/server.js'],{env,stdio:['ignore',openSync('tmp/audit-api.log','w'),openSync('tmp/audit-api-error.log','w')],windowsHide:true});
 api2=spawn(process.execPath,['apps/api/dist/server.js'],{env:{...env,PORT:'4200'},stdio:['ignore',openSync('tmp/audit-api2.log','w'),openSync('tmp/audit-api2-error.log','w')],windowsHide:true});
 for(let n=0;n<100;n++){try{if((await fetch(root+'/api/health')).ok && (await fetch('http://127.0.0.1:4200/api/health')).ok)break;}catch{}await wait(100);}
 const buyer={buyerName:'Local audit',buyerEmail:'audit@example.invalid',buyerPhone:'00000000'};
 const proposal=values=>request('/api/campaigns/local-audit/proposal',{quantity:values.length,values});
 const reserve=p=>request('/api/reservations',{campaignId:campaign.id,values:p.data.values,...buyer},p.cookie);
 const started=performance.now();const proposals=await Promise.all(Array.from({length:12},()=>proposal([42])));
 assert.equal(proposals.filter(p=>p.status===200).length,1);assert.ok(proposals.every(p=>[200,409].includes(p.status)));
 const owner=proposals.find(p=>p.status===200);
 const results=await Promise.all(Array.from({length:12},()=>reserve(owner)));
 
 assert.equal(results.filter(r=>r.status===201).length,1);assert.ok(results.every(r=>[201,409].includes(r.status)));
 assert.equal(await db.reservation.count(),1);assert.equal(await db.emailNotification.count(),1);
 const winner=results.find(r=>r.status===201).data;const elapsed=performance.now()-started;
 const reservation=await db.reservation.findUnique({where:{lookupToken:winner.token}});
 assert.ok(Math.abs(reservation.expiresAt-reservation.createdAt-1800000)<2000);
 assert.equal((await proposal([42])).status,409);
 const random=await request('/api/campaigns/local-audit/proposal',{quantity:1});assert.ok(!random.data.values.includes(42));await request('/api/campaigns/local-audit/proposal',{quantity:1,values:[]},random.cookie);
 assert.equal((await request('/api/reservations/'+winner.token+'/proofs',proof)).status,201);
 assert.equal((await request('/api/reservations/'+winner.token+'/proofs',proof)).status,201);
 assert.equal(await db.emailNotification.count({where:{reservationId:reservation.id,kind:'PENDING_REVIEW'}}),0);
 assert.equal(await db.emailNotification.count({where:{reservationId:reservation.id,kind:'RESERVED'}}),1);
 await db.reservation.update({where:{id:reservation.id},data:{expiresAt:new Date(Date.now()-1000)}});
 await wait(5100);await request('/api/campaigns/local-audit/numbers');
 assert.equal((await db.entryNumber.findUnique({where:{campaignId_value:{campaignId:campaign.id,value:42}}})).status,'RESERVED');
 const login=await request('/api/admin/login',{pin:'123456'});
 assert.equal((await request('/api/admin/reservations/'+reservation.id+'/confirm',{},'',login.data.token)).status,200);
 assert.equal((await proposal([42])).status,409);
 const old=await reserve(await proposal([43]));await db.reservation.update({where:{lookupToken:old.data.token},data:{expiresAt:new Date(Date.now()-1)}});
 assert.equal((await request('/api/reservations/'+old.data.token+'/proofs',proof)).status,409);
 await wait(5100);await request('/api/campaigns/local-audit/numbers');assert.equal((await proposal([43])).status,200);
 const pairs=await Promise.all([proposal([10,11]),proposal([10,12])]);assert.equal(pairs.filter(p=>p.status===200).length,1);assert.ok(pairs.every(p=>[200,409].includes(p.status)));
 assert.equal((await reserve(pairs.find(p=>p.status===200))).status,201);
 const grouped=await db.entryNumber.count({where:{campaignId:campaign.id,value:{in:[10,11,12]},status:'RESERVED'}});assert.equal(grouped,2);
 assert.equal((await request('/api/campaigns/local-audit/proposal',{quantity:2,values:[1,1]})).status,400);
 assert.equal((await request('/api/campaigns/local-audit/proposal',{quantity:2,values:[99,100]})).status,409);

 // Clear only synthetic selection holds to test a mixed manual/random burst.
 await db.entryNumber.updateMany({data:{holdKey:null,holdExpiresAt:null}});
 await db.numberProposal.updateMany({data:{expiresAt:new Date(0)}});
 const mixed=await Promise.all(Array.from({length:30},(_,i)=>i%2?proposal([50+i]):request('/api/campaigns/local-audit/proposal',{quantity:2})));
 assert.ok(mixed.every(p=>[200,409].includes(p.status)));
 const granted=mixed.filter(p=>p.status===200).flatMap(p=>p.data.values);
 assert.equal(new Set(granted).size,granted.length);
 const one=mixed.find(p=>p.status===200);const key=one.cookie.split('=')[1];
 const firstExpiry=one.data.expiresAt;
 const refresh=await request('/api/campaigns/local-audit/proposal',{quantity:one.data.values.length,values:one.data.values},one.cookie);assert.equal(refresh.data.expiresAt,firstExpiry);
 assert.ok(Math.abs(new Date(firstExpiry)-Date.now()-300000)<10000);
 // Partial manual selection blocks immediately and releases deselected values.
 const free=await db.entryNumber.findFirst({where:{status:'AVAILABLE',holdKey:null}});const manualValue=free.value;
 const partial=await request('/api/campaigns/local-audit/proposal',{quantity:2,values:[manualValue]});assert.equal(partial.status,200);
 assert.equal((await proposal([manualValue])).status,409);
 assert.equal((await request('/api/campaigns/local-audit/proposal',{quantity:2,values:[]},partial.cookie)).status,200);
 assert.equal((await proposal([manualValue])).status,200);
 // Abandoned selection expires even without a browser request to release it.
 await db.entryNumber.updateMany({where:{holdKey:key},data:{holdExpiresAt:new Date(0)}});
 await db.numberProposal.updateMany({where:{sessionKey:key},data:{expiresAt:new Date(0)}});
 const {createReservationExpirer}=await import('../apps/api/dist/reservationExpiry.js');
 await createReservationExpirer(db,()=>{})();
 assert.equal(await db.entryNumber.count({where:{holdKey:key}}),0);
 assert.equal((await reserve(one)).status,409);
 const reclaimed=await proposal(one.data.values);assert.equal(reclaimed.status,200);
 const listing=await request('/api/campaigns/local-audit/numbers');
 assert.equal(listing.data.numbers.find(n=>n.value===one.data.values[0]).status,'HELD');
 const ownListing=await request('/api/campaigns/local-audit/numbers',undefined,reclaimed.cookie);
 assert.equal(ownListing.data.numbers.find(n=>n.value===one.data.values[0]).status,'AVAILABLE');
 // Inverses must be explicitly held, and cannot be stolen while selected.
 await db.campaign.update({where:{id:campaign.id},data:{invertedEnabled:true}});
 await db.entryNumber.updateMany({where:{value:{in:[23,32]}},data:{holdKey:null,holdExpiresAt:null}});
 const inv=await proposal([23]);assert.equal(inv.status,200);
 assert.equal((await request('/api/campaigns/local-audit/proposal',{quantity:1,values:[23],includeInverted:true},inv.cookie)).status,200);
 assert.equal((await proposal([32])).status,409);
 assert.equal((await request('/api/reservations',{campaignId:campaign.id,values:[23],includeInverted:true,...buyer},inv.cookie)).status,201);
 const search=await request('/api/campaigns/local-audit/numbers?search=0');assert.equal(search.data.numbers.length,10);assert.ok(search.data.numbers.every(n=>n.value<10));
 const {auditStickers}=await import('./sticker-audit.mjs');await auditStickers(request,db,proof,login.data.token);
 const {auditLottery}=await import('./lottery-audit.mjs');await auditLottery(request,db,login.data.token);
 const {auditPublishedPrices}=await import('./published-price-audit.mjs');const priceReport=await auditPublishedPrices(root,login.data.token);assert.equal(await db.emailNotification.count({where:{reservation:{campaignId:priceReport.campaignId}}}),0);console.log(JSON.stringify(priceReport));
 const {auditSecurity}=await import('./security-audit.mjs');await auditSecurity(root,db,proof);
 console.log(JSON.stringify({result:'PASS',simultaneousRequests:12,successfulReservations:1,concurrencyMilliseconds:Math.round(elapsed),apiProcesses:2,mixedSelectionRequests:30,uniqueHeldNumbers:granted.length,checks:['mixed manual/random uniqueness','partial selection lock','deselection release','fixed five-minute expiry','expired owner rejected','expired hold reclaimed','inverse hold exclusivity','30-minute duration','manual unavailable rejection','random excludes reserved','no duplicate review email','proof preserves hold','sold exclusion','expired proof rejection','expired release','overlapping package rollback','manual duplicates and range','leading-zero search']}));
}finally{if(api2)api2.kill();if(api){api.kill();await wait(300);}if(db)await db.$disconnect();await database.stop();}
