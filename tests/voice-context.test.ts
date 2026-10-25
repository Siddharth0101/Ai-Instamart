import assert from "node:assert/strict";
import test from "node:test";
import { AssistantViewSchema } from "../src/lib/assistant-contracts";
import { buildVoiceContext } from "../src/lib/voice-context";

function fixture() {
  const restaurant={id:"new-place",provider:"swiggy_food",name:"Curry House",isOpen:true};
  return AssistantViewSchema.parse({
    id:"voice-context",version:2,task:{},questions:[],suggestions:[],notices:[],offers:[],providers:[],
    messages:[{id:"reply",role:"assistant",text:"What would you like from Curry House?",createdAt:"2026-10-24T10:00:00Z"}],
    restaurantBrowser:{itemId:"food",restaurants:[restaurant],selectedRestaurantId:restaurant.id,menu:{
      restaurantId:restaurant.id,restaurant,sections:[{id:"mains",title:"Mains",items:[
        {id:"dal",itemId:"food",provider:"swiggy_food",providerItemId:"dal-native",name:"Dal Tadka",unit:"serving",priceMinor:20000,available:true},
        {id:"rice",itemId:"food",provider:"swiggy_food",providerItemId:"rice-native",name:"Jeera Rice",unit:"serving",priceMinor:20000,available:true},
      ]}],hasMore:false,
    }},status:"needs_choice",updatedAt:"2026-10-24T10:00:00Z",
  });
}

test("recognition includes the current filtered dishes and last assistant question",()=>{
  const context=buildVoiceContext(fixture(),{visibleRestaurantIds:[]},{surface:"menu",visibleOfferIds:["rice"],focusedOfferId:"rice"});
  assert.ok(context.keyterms.includes("Jeera Rice"));
  assert.ok(context.keyterms.includes("Curry House"));
  assert.ok(!context.keyterms.includes("Dal Tadka"));
  assert.equal(context.previousText,"What would you like from Curry House?");
});

test("a newly committed menu supplies vocabulary before its old visible IDs update",()=>{
  const context=buildVoiceContext(fixture(),{visibleRestaurantIds:["old-place"]},{surface:"menu",visibleOfferIds:["old-dish"],focusedOfferId:"old-dish"});
  assert.ok(context.keyterms.includes("Dal Tadka"));
  assert.ok(context.keyterms.includes("Jeera Rice"));
  assert.ok(!context.keyterms.includes("old-dish"));
});

test("focused dish names retain recognition priority within provider vocabulary limits",()=>{
  const view=fixture(),section=view.restaurantBrowser!.menu!.sections[0];
  section.items=Array.from({length:80},(_,index)=>({...section.items[0],id:`dish-${index}`,name:`Special dish ${index}`}));
  const context=buildVoiceContext(view,{visibleRestaurantIds:[]},{surface:"menu",visibleOfferIds:section.items.map(item=>item.id),focusedOfferId:"dish-79"});
  assert.ok(context.keyterms.includes("Special dish 79"));
  assert.ok(context.keyterms.length<=50);
  assert.ok(context.keyterms.every(term=>term.length<=20));
  assert.deepEqual(buildVoiceContext(null,{visibleRestaurantIds:[]},{}),{keyterms:[]});
});
