import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentEmail} from '../dist/paymentEmails.js';
test('all email variants use light layout and private fragment-only copy links',()=>{
 const token='0123456789abcdef'.repeat(3);
 const order={orderNumber:1,buyerName:'<script>x</script>',lookupToken:token,selectedValues:[1],totalCrc:2000,reviewNote:'<img src=x>',campaign:{title:'Sample',numberWidth:3}};
 for(const kind of ['CONFIRMED','REJECTED','RESERVED','PENDING_REVIEW']){
  const mail=paymentEmail(order,kind,'https://vnovatcg.com');
  assert.match(mail.html,/background:#ffffff/);
  assert.match(mail.html,/background:#191919/);
  assert.match(mail.html,/Copiar código de consulta/);
  for(const match of mail.html.matchAll(/href="([^"]+)"/g)){
   const url=new URL(match[1]);assert.equal(url.origin,'https://vnovatcg.com');
   assert.ok(!url.search.includes(token));assert.ok(!url.pathname.includes(token));
  }
  assert.ok(mail.html.includes('/pedido?copiar=1#'+token));
  assert.ok(!mail.html.includes('<script>'));assert.ok(!mail.html.includes('onclick='));
 }
 for(const origin of ['http://example.com','javascript:alert(1)','https://user:password@example.com'])assert.throws(()=>paymentEmail(order,'CONFIRMED',origin));
});
