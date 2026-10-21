import assert from 'node:assert/strict';

// Runs against localhost first, then the explicitly authorized published origin.
export async function auditPublishedPrices(origin, token) {
  assert.ok(['http://127.0.0.1:4199','https://vnovatcg.com'].includes(origin));
  const call=async(path,{method='GET',body,cookie='',admin=true}={})=>{
    const response=await fetch(origin+path,{method,headers:{...(admin?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie};
  };
  const slug='prueba-precios-'+Date.now();let id;
  const spec={isTest:true,title:'[PRUEBA TÉCNICA] Precios — sin compra real',slug,description:'Diagnóstico autorizado. Sin premio, compra ni pago real. Oculto del catálogo.',prizes:['Sin premio real'],prizeSources:[0],numberCount:100,numbersPerSticker:2,priceCrc:2000,packages:[{quantity:30,priceCrc:25000}]};
  try {
    const created=await call('/api/admin/campaigns',{method:'POST',body:spec});assert.equal(created.status,201);id=created.data.id;assert.equal(created.data.isTest,true);
    assert.equal((await call('/api/admin/campaigns/'+id+'/publish',{method:'POST',body:{}})).status,200);
    assert.ok(!(await call('/api/campaigns',{admin:false})).data.some(item=>item.id===id));
    assert.equal((await call('/api/campaigns/'+slug,{admin:false})).status,404);
    assert.equal((await call('/api/campaigns/'+slug+'/proposal',{method:'POST',body:{quantity:30},admin:false})).status,404);
    const buyer={buyerName:'PRUEBA TÉCNICA SIN COMPRA',buyerEmail:'diagnostico@example.invalid',buyerPhone:'00000000'};
    const select=async()=>{const result=await call('/api/campaigns/'+slug+'/proposal',{method:'POST',body:{quantity:30}});assert.equal(result.status,200);return result;};
    const reserve=async(selection,price)=>call('/api/reservations',{method:'POST',cookie:selection.cookie,body:{campaignId:id,values:selection.data.values,expectedTotalCrc:price,...buyer}});
    const firstSelection=await select();const first=await reserve(firstSelection,25000);assert.equal(first.status,201);
    const history=await call('/api/admin/campaigns/'+id+'/history');const firstId=history.data.reservations.find(item=>item.totalCrc===25000).id;
    const proof={mimeType:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6eeIAAAAASUVORK5CYII='};
    assert.equal((await call('/api/reservations/'+first.data.token+'/proofs',{method:'POST',body:proof})).status,201);
    assert.equal((await call('/api/admin/reservations/'+firstId+'/confirm',{method:'POST',body:{}})).status,200);
    const secondSelection=await select();
    assert.equal((await call('/api/admin/campaigns/'+id,{method:'PATCH',body:{title:spec.title,description:spec.description,packages:[{quantity:30,priceCrc:22000}]}})).status,200);
    const lookup=await call('/api/reservations/lookup',{method:'POST',body:{token:first.data.token}});
    assert.equal(lookup.data.totalCrc,25000);assert.equal(lookup.data.status,'CONFIRMED');assert.deepEqual(lookup.data.values,first.data.values);
    assert.equal((await reserve(secondSelection,25000)).status,409);
    const second=await reserve(secondSelection,22000);assert.equal(second.status,201);assert.equal(second.data.totalCrc,22000);
    const newLookup=await call('/api/reservations/lookup',{method:'POST',body:{token:second.data.token}});assert.equal(newLookup.data.totalCrc,22000);
    const report={origin,campaignId:id,slug,result:'PASS',card:{boletos:15,numbers:30},previousOrder:{number:first.data.orderNumber,status:lookup.data.status,totalCrc:lookup.data.totalCrc},newOrder:{number:second.data.orderNumber,totalCrc:second.data.totalCrc},stalePriceRejected:true,previousNumbersUnchanged:true,hiddenFromPublic:true};
    return report;
  } finally {
    if(id){const finish=await call('/api/admin/campaigns/'+id+'/finish-test',{method:'POST',body:{}});assert.equal(finish.status,200,'Test campaign must be retired');assert.equal((await call('/api/campaigns/'+slug)).status,404);}
  }
}
