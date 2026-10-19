import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentEmail, retryableEmailStatus, createEmailWorker } from '../dist/paymentEmails.js';
const order = { orderNumber: 12, buyerName: '<img src=x>', lookupToken: 'abc', selectedValues: [1, 120], totalCrc: 4000, reviewNote: '<script>bad</script>', campaign: { title: 'Rifa & premio', numberWidth: 4 } };
test('payment email escapes HTML and preserves order, padded numbers and private link', () => {
 const email = paymentEmail(order, 'CONFIRMED', 'https://vnovatcg.com');
 assert.match(email.subject, /CY-000012/); assert.match(email.text, /0001, 0120/);
 assert.match(email.html, /&lt;img/); assert.ok(!email.html.includes('<img src=x>')); assert.match(email.html, /alt="Logo Vnova TCG"/);
 assert.match(email.html, /https:\/\/vnovatcg.com\/pedido#abc/);
 assert.throws(() => paymentEmail(order, 'CONFIRMED', 'javascript:alert(1)'));
 const rejected = paymentEmail(order, 'REJECTED', 'https://vnovatcg.com');
 assert.match(rejected.text, /Motivo:/); assert.match(rejected.html, /&lt;script&gt;/);
});
test('only transient provider statuses retry', () => {
 for (const status of [408, 429, 500, 503]) assert.equal(retryableEmailStatus(status), true);
 for (const status of [400, 401, 403, 422]) assert.equal(retryableEmailStatus(status), false);
});
test('worker retries with same payload/key, coalesces kicks and persists acceptance', async () => {
 const oldFetch=global.fetch; const oldKey=process.env.RESEND_API_KEY; const oldFrom=process.env.EMAIL_FROM;
 process.env.RESEND_API_KEY='test'; process.env.EMAIL_FROM='Vnova TCG <pedidos@vnovatcg.com>';
 let job={ id:'test-job', status:'PENDING', recipient:'test@example.com', subject:'Test', html:'<p>Test</p>', text:'Test', sender:null, firstAttemptAt:null, attempts:0, availableAt:new Date(0) };
 const requests=[]; let reads=0;
 const db={emailNotification:{findFirst:async()=>{reads++;return job.status==='PENDING' && job.availableAt<=new Date()?{...job}:null;},updateMany:async({data})=>{job={...job,...data,attempts:job.attempts+1};return{count:1};},update:async({data})=>{job={...job,...data};return job;}}};
 global.fetch=async(url,options)=>{requests.push(options);return requests.length===1?new Response('{}',{status:503}):new Response('{"id":"provider-id"}',{status:200});};
 let worker=createEmailWorker(db,()=>{},()=>assert.fail('Worker error'));
 try {
 worker.kick();worker.kick(); await new Promise(r=>setTimeout(r,750));await worker.close();
 assert.equal(job.status,'PENDING');assert.equal(job.lastError,'RESEND_HTTP_503');assert.equal(requests.length,1);
 job.availableAt=new Date(0);process.env.EMAIL_FROM='Changed <changed@example.com>';
 worker=createEmailWorker(db,()=>{},()=>assert.fail('Worker error'));worker.kick();await new Promise(r=>setTimeout(r,750));await worker.close();
 assert.equal(job.status,'SENT');assert.equal(job.providerId,'provider-id');
 assert.equal(requests[0].body,requests[1].body);assert.equal(requests[0].headers['Idempotency-Key'],requests[1].headers['Idempotency-Key']);
 } finally {await worker.close();global.fetch=oldFetch;if(oldKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=oldKey;if(oldFrom===undefined)delete process.env.EMAIL_FROM;else process.env.EMAIL_FROM=oldFrom;}
});
test('diagnostic emails are explicitly labeled and contain no private order link', () => {
 for (const kind of ['CONFIRMED', 'REJECTED']) {
  const email=paymentEmail(order, kind, 'https://vnovatcg.com', true);
  assert.match(email.subject, /^\[PRUEBA\]/);
  assert.match(email.text, /No representa una compra ni un pago real/);
  assert.match(email.html, /No representa una compra ni un pago real/);
  assert.ok(!email.html.includes('/pedido#'));assert.ok(!email.text.includes('/pedido#'));
 }
});
