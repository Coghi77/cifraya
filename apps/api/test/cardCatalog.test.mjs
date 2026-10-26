import test from 'node:test';
import assert from 'node:assert/strict';
import {cardCollectionInput,cardCollectionUpdate} from '../dist/cardCatalog.js';
const fixture={name:'Colección',edition:'Edición en inglés',sourceUrl:'https://www.pokemon.com/',published:false,cards:[{name:'Pikachu',rarity:'Common',number:'001',imageUrl:'https://example.com/card.png'}]};
test('catalog rejects executable, insecure and credential-bearing image URLs',()=>{
 for(const imageUrl of ['javascript:alert(1)','data:image/svg+xml,test','http://example.com/x.png','https://user:secret@example.com/x.png'])assert.equal(cardCollectionInput.safeParse({...fixture,cards:[{...fixture.cards[0],imageUrl}]}).success,false);
 assert.equal(cardCollectionInput.safeParse(fixture).success,true);
});
test('catalog requires complete cards and caps content',()=>{
 for(const cards of [[],[{...fixture.cards[0],rarity:'  '}],Array(101).fill(fixture.cards[0])])assert.equal(cardCollectionInput.safeParse({...fixture,cards}).success,false);
 assert.equal(cardCollectionInput.safeParse({...fixture,price:100}).success,false);
});
test('editing requires a positive concurrency version',()=>{
 assert.equal(cardCollectionUpdate.safeParse(fixture).success,false);
 assert.equal(cardCollectionUpdate.safeParse({...fixture,version:0}).success,false);
 assert.equal(cardCollectionUpdate.safeParse({...fixture,version:1}).success,true);
});
