import {openSync, existsSync} from 'node:fs';
import EmbeddedPostgres from '../tmp/reservation-tests/node_modules/embedded-postgres/dist/index.js';
import {PrismaClient} from '@prisma/client';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const database=new EmbeddedPostgres({databaseDir:'./tmp/reservation-tests/data',user:'tester',password:'local-only',port:5546,persistent:true,onLog:()=>{},onError:()=>{}});
let api;let db;
const root='http://127.0.0.1:4199';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function request(path,body,cookie='',auth='') {const response=await fetch(root+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...(auth?{Authorization:'Bearer '+auth}:{})},body:body===undefined?undefined:JSON.stringify(body)});return{status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie};}
const proof={mimeType:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6eeIAAAAASUVORK5CYII='};
try {
 if (!existsSync('./tmp/reservation-tests/data/PG_VERSION')) await database.initialise();
 await database.start();const name='audit_'+Date.now();const client=database.getPgClient();await client.connect();await client.query(`CREATE DATABASE ${name} ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`);await client.end();
 const env={...process.env,DATABASE_URL:'postgresql://tester:local-only@127.0.0.1:5546/'+name,NODE_ENV:'test',PORT:'4199',ADMIN_PIN:'123456',ADMIN_TOKEN:'local-test-secret-longer-than-24-characters',RESEND_API_KEY:'',EMAIL_FROM:''};
 execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy'],{env,stdio:'pipe',windowsHide:true});
 db=new PrismaClient({datasourceUrl:env.DATABASE_URL});
 const campaign=await db.campaign.create({data:{title:'Local concurrency audit',slug:'local-audit',prize:'Local',priceCrc:2000,numberCount:100,numberWidth:2,status:'LIVE',packages:{create:[{quantity:1,priceCrc:2000},{quantity:2,priceCrc:3000}]},numbers:{create:Array.from({length:100},(_,value)=>({value}))}}});
 api=spawn(process.execPath,['apps/api/dist/server.js'],{env,stdio:['ignore',openSync('tmp/audit-api.log','w'),openSync('tmp/audit-api-error.log','w')],windowsHide:true});
 for(let n=0;n<100;n++){try{if((await fetch(root+'/api/health')).ok)break;}catch{}await wait(100);}
 const buyer={buyerName:'Local audit',buyerEmail:'audit@example.invalid',buyerPhone:'00000000'};
 const proposal=values=>request('/api/campaigns/local-audit/proposal',{quantity:values.length,values});
 const reserve=p=>request('/api/reservations',{campaignId:campaign.id,values:p.data.values,...buyer},p.cookie);
 const proposals=[];for(let i=0;i<12;i++)proposals.push(await proposal([42]));
 const started=performance.now();const results=await Promise.all(proposals.map(reserve));
 
 assert.equal(results.filter(r=>r.status===201).length,1);assert.ok(results.every(r=>[201,409].includes(r.status)));
 assert.equal(await db.reservation.count(),1);assert.equal(await db.emailNotification.count(),1);
 const winner=results.find(r=>r.status===201).data;const elapsed=performance.now()-started;
 const reservation=await db.reservation.findUnique({where:{lookupToken:winner.token}});
 assert.ok(Math.abs(reservation.expiresAt-reservation.createdAt-1800000)<2000);
 assert.equal((await proposal([42])).status,409);
 const random=await request('/api/campaigns/local-audit/proposal',{quantity:1});assert.ok(!random.data.values.includes(42));
 assert.equal((await request('/api/reservations/'+winner.token+'/proofs',proof)).status,201);
 assert.equal((await request('/api/reservations/'+winner.token+'/proofs',proof)).status,201);
 assert.equal(await db.emailNotification.count({where:{reservationId:reservation.id,kind:'PENDING_REVIEW'}}),1);
 await db.reservation.update({where:{id:reservation.id},data:{expiresAt:new Date(Date.now()-1000)}});
 await wait(5100);await request('/api/campaigns/local-audit/numbers');
 assert.equal((await db.entryNumber.findUnique({where:{campaignId_value:{campaignId:campaign.id,value:42}}})).status,'RESERVED');
 const login=await request('/api/admin/login',{pin:'123456'});
 assert.equal((await request('/api/admin/reservations/'+reservation.id+'/confirm',{},'',login.data.token)).status,200);
 assert.equal((await proposal([42])).status,409);
 const old=await reserve(await proposal([43]));await db.reservation.update({where:{lookupToken:old.data.token},data:{expiresAt:new Date(Date.now()-1)}});
 assert.equal((await request('/api/reservations/'+old.data.token+'/proofs',proof)).status,409);
 await wait(5100);await request('/api/campaigns/local-audit/numbers');assert.equal((await proposal([43])).status,200);
 const a=await proposal([10,11]),b=await proposal([10,12]);const paired=await Promise.all([reserve(a),reserve(b)]);
 assert.equal(paired.filter(r=>r.status===201).length,1);assert.ok(paired.every(r=>[201,409].includes(r.status)));
 const grouped=await db.entryNumber.count({where:{campaignId:campaign.id,value:{in:[10,11,12]},status:'RESERVED'}});assert.equal(grouped,2);
 assert.equal((await request('/api/campaigns/local-audit/proposal',{quantity:2,values:[1,1]})).status,400);
 assert.equal((await request('/api/campaigns/local-audit/proposal',{quantity:2,values:[99,100]})).status,409);
 const search=await request('/api/campaigns/local-audit/numbers?search=0');assert.equal(search.data.numbers.length,10);assert.ok(search.data.numbers.every(n=>n.value<10));
 console.log(JSON.stringify({result:'PASS',simultaneousRequests:12,successfulReservations:1,concurrencyMilliseconds:Math.round(elapsed),checks:['30-minute duration','manual unavailable rejection','random excludes reserved','single review email','proof preserves hold','sold exclusion','expired proof rejection','expired release','overlapping package rollback','manual duplicates and range','leading-zero search']}));
}finally{if(api){api.kill();await wait(300);}if(db)await db.$disconnect();await database.stop();}
