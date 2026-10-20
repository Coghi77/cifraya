import assert from 'node:assert/strict';

export async function auditStickers(request, db, proof, token) {
  const data = {title:'Sticker audit',slug:'sticker-audit',prizes:['Premio local'],prizeSources:[0],priceCrc:2000,numbersPerSticker:2,numberCount:1000,packages:[{quantity:2,priceCrc:2000},{quantity:30,priceCrc:25000}]};
  for (const packages of [[{quantity:3,priceCrc:2000}], [{quantity:2,priceCrc:2000},{quantity:2,priceCrc:3000}], [{quantity:102,priceCrc:2000}], [{quantity:2,priceCrc:0}]]) assert.equal((await request('/api/admin/campaigns',{...data,packages},'',token)).status,400);
  const created = await request('/api/admin/campaigns', data, '', token);
  assert.equal(created.status,201);
  const id=created.data.id;
  assert.equal(created.data.numbersPerSticker,2);
  for(let i=0;i<3;i++) assert.equal((await request(`/api/admin/campaigns/${id}/photos`,proof,'',token)).status,201);
  assert.equal((await request(`/api/admin/campaigns/${id}/photos`,proof,'',token)).status,409);
  assert.equal((await request(`/api/admin/campaigns/${id}/publish`,{},'',token)).status,200);
  assert.equal((await request('/api/campaigns/sticker-audit/proposal',{quantity:3})).status,400);
  assert.equal((await request('/api/campaigns/sticker-audit/proposal',{quantity:4})).status,400);
  const publicRaffle=await request('/api/campaigns/sticker-audit');
  assert.deepEqual(publicRaffle.data.packages,[{quantity:2,priceCrc:2000},{quantity:30,priceCrc:25000}]);
  const proposal=await request('/api/campaigns/sticker-audit/proposal',{quantity:30});
  assert.equal(proposal.status,200);assert.equal(proposal.data.values.length,30);
  const competing=await request('/api/campaigns/sticker-audit/proposal',{quantity:2,values:proposal.data.values.slice(0,2)});
  assert.equal(competing.status,409);
  const order=await request('/api/reservations',{campaignId:id,values:proposal.data.values,buyerName:'Sticker audit',buyerEmail:'audit@example.invalid',buyerPhone:'00000000',totalCrc:1,stickerCount:1},proposal.cookie);
  assert.equal(order.status,201);assert.equal(order.data.totalCrc,25000);
  const lookup=await request('/api/reservations/lookup',{token:order.data.token});
  assert.equal(lookup.data.stickerCount,15);assert.equal(lookup.data.numbersPerSticker,2);
  const stored=await db.reservation.findUnique({where:{lookupToken:order.data.token}});
  const email=await db.emailNotification.findFirst({where:{reservationId:stored.id,kind:'RESERVED'}});
  assert.match(email.html,/15 stickers/);
  console.log(JSON.stringify({stickers:'PASS',checks:['15 stickers / 30 unique numbers / CRC 25000','price and count tampering ignored','incomplete sticker rejected','held numbers excluded','three-photo limit','order snapshot and email']}));
}
