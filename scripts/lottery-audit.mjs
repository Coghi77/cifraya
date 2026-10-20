import assert from 'node:assert/strict';

export async function auditLottery(request,db,token) {
  const started=performance.now();
  const created=await request('/api/admin/campaigns',{title:'Lottery audit',slug:'lottery-audit',prizes:['Principal','Inverso','Tercero'],prizeSources:[-1,1,-2],priceCrc:2000,numbersPerSticker:2,numberCount:100000},'',token);
  assert.equal(created.status,201);
  const id=created.data.id;
  assert.equal(await db.entryNumber.count({where:{campaignId:id}}),100000);
  assert.equal((await request(`/api/admin/campaigns/${id}/publish`,{},'',token)).status,200);
  const body={position:1,drawResults:['12','34','56','78'],drawReference:'Sorteo de prueba · 20/10/2026'};
  assert.equal((await request(`/api/admin/campaigns/${id}/draw-preview`,body)).status,401);
  const preview=await request(`/api/admin/campaigns/${id}/draw-preview`,body,'',token);
  assert.equal(preview.status,200);assert.equal(preview.data.value,12346);assert.equal(preview.data.sold,false);
  assert.equal((await request(`/api/admin/campaigns/${id}/winner`,{...body,numberValue:12345},'',token)).status,409);
  assert.equal((await request(`/api/admin/campaigns/${id}/winner`,{...body,numberValue:12346,expectedSold:false},'',token)).status,201);
  assert.equal((await request(`/api/admin/campaigns/${id}/winner`,{position:2,numberValue:64321,expectedSold:false},'',token)).status,201);
  assert.equal((await request(`/api/admin/campaigns/${id}/winner`,{...body,position:3,drawResults:['12','34','56','79'],numberValue:34569},'',token)).status,400);
  assert.equal((await request(`/api/admin/campaigns/${id}/winner`,{...body,position:3,numberValue:34568,expectedSold:false},'',token)).status,201);
  const finished=await db.campaign.findUnique({where:{id},include:{winners:{orderBy:{position:'asc'}}}});
  assert.equal(finished.status,'CLOSED');
  assert.deepEqual(finished.winners.map(w=>w.numberValue),[12346,64321,34568]);
  assert.ok(finished.winners.every(w=>w.reservationId===null));
  console.log(JSON.stringify({lottery:'PASS',inventory:100000,milliseconds:Math.round(performance.now()-started),checks:['five-digit inventory','authenticated preview','server-derived result','inverse not rotation','locked official results','unsold outcome explicit','third-prize composition','close after last prize']}));
}
