import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {sitemap,registerSeo} from '../dist/seo.js';
import {registerSecurityHeaders} from '../dist/security.js';

test('sitemap includes only public live raffles, never drafts or tests',()=>{
 const result=sitemap([{slug:'publica',status:'LIVE',isTest:false},{slug:'borrador',status:'DRAFT',isTest:false},{slug:'prueba',status:'LIVE',isTest:true},{slug:'cerrada',status:'CLOSED',isTest:false}],false);
 assert.match(result,/https:\/\/vnovatcg.com\/rifa\/publica/);
 assert.doesNotMatch(result,/borrador|prueba|cerrada|pedido|estudio|buscar-boletos/);
 assert.doesNotMatch(sitemap([{slug:'publica',status:'LIVE',isTest:false}],true),/rifa|ganadores/);
});
test('SEO endpoints return real text and XML; private pages are noindex',async()=>{
 const app=Fastify();registerSecurityHeaders(app,false);
 registerSeo(app,async()=>({campaigns:[],comingSoon:false}));
 for(const path of ['/pedido','/buscar-boletos','/estudio-vnova','/ganadores'])app.get(path,async()=>'<html></html>');
 const robots=await app.inject('/robots.txt');assert.match(robots.headers['content-type'],/text\/plain/);assert.match(robots.body,/Sitemap: https:\/\/vnovatcg.com\/sitemap.xml/);
 const map=await app.inject('/sitemap.xml');assert.match(map.headers['content-type'],/application\/xml/);assert.match(map.body,/<urlset/);
 for(const path of ['/pedido?code=secret','/buscar-boletos','/estudio-vnova'])assert.equal((await app.inject(path)).headers['x-robots-tag'],'noindex, nofollow');
 assert.equal((await app.inject('/ganadores')).headers['x-robots-tag'],undefined);
 await app.close();
});
