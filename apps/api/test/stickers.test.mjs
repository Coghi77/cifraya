import test from 'node:test';
import assert from 'node:assert/strict';
import {purchaseOffer} from '../dist/stickers.js';

test('stickers charge per unit and require complete groups', () => {
  const campaign = {numbersPerSticker: 2, priceCrc: 2000, packages: []};
  assert.equal(purchaseOffer(campaign, 2).priceCrc, 2000);
  assert.equal(purchaseOffer(campaign, 30).priceCrc, 30000);
  for (const quantity of [0, 1, 3, 101, 102, -2, 1.5]) assert.equal(purchaseOffer(campaign, quantity), undefined);
  assert.equal(purchaseOffer({...campaign, numbersPerSticker: 1, priceCrc: 100000000}, 100), undefined);
});

test('existing package prices remain unchanged', () => {
  const campaign = {numbersPerSticker: null, priceCrc: 2000, packages: [{quantity: 3, priceCrc: 4000}]};
  assert.equal(purchaseOffer(campaign, 3).priceCrc, 4000);
  assert.equal(purchaseOffer(campaign, 2), undefined);
});

test('configured sticker cards use exact prices and reject unlisted quantities', () => {
  const campaign = {numbersPerSticker:2,priceCrc:2000,packages:[{quantity:2,priceCrc:2500},{quantity:30,priceCrc:25000}]};
  assert.equal(purchaseOffer(campaign,2).priceCrc,2500);
  assert.equal(purchaseOffer(campaign,30).priceCrc,25000);
  assert.equal(purchaseOffer(campaign,4),undefined);
  assert.equal(purchaseOffer(campaign,3),undefined);
});
