import type { Discovery } from "./assistant-contracts";

export type DiscoveryCategory={id:string;label:string;query:string;emoji:string;description:string;route:"restaurant"|"instamart"};
const food=(id:string,label:string,query:string,emoji:string,description:string):DiscoveryCategory=>({id,label,query,emoji,description,route:"restaurant"});
const snack=(id:string,label:string,query:string,emoji:string,description:string):DiscoveryCategory=>({id,label,query,emoji,description,route:"instamart"});
const breakfast:readonly DiscoveryCategory[]=[
  food("dosa","Dosa","dosa","🥞","Crisp, comforting breakfast favourites"),
  food("idli","Idli","idli","🍚","Soft idlis, sides and breakfast plates"),
  food("parathas","Parathas","paratha","🫓","Stuffed and classic parathas"),
  food("poha","Poha & upma","poha upma","🥣","A lighter start to the day"),
  food("sandwiches","Sandwiches","sandwich","🥪","Toasties, fillings and quick bites"),
  food("breakfast-combos","Breakfast combos","breakfast combo","🍳","Breakfast plates and combinations"),
];
const mains:readonly DiscoveryCategory[]=[
  food("biryani","Biryani","biryani","🍛","Rice, spice and your favourite style"),
  food("pizza","Pizza","pizza","🍕","Choose a crust, topping and size"),
  food("thalis","Thalis","thali","🍱","A complete meal with a little variety"),
  food("north-indian","North Indian","North Indian meals","🫓","Curries, breads and comforting mains"),
  food("south-indian","South Indian","South Indian meals","🥘","Dosas, rice meals and regional favourites"),
  food("chinese","Chinese","Chinese noodles fried rice","🍜","Noodles, fried rice and more"),
  food("burgers","Burgers","burger","🍔","Burgers, sides and meal combos"),
  food("sandwiches","Sandwiches","sandwich","🥪","A quick bite or a fuller meal"),
];
const snacks:readonly DiscoveryCategory[]=[
  snack("chips","Chips & crisps","chips","🥔","Brands, flavours and pack sizes"),
  snack("biscuits","Biscuits & cookies","biscuits cookies","🍪","Tea-time treats and cookie favourites"),
  snack("namkeen","Namkeen","namkeen","🥨","Mixtures, savouries and crunchy bites"),
  snack("chocolates","Chocolates","chocolate","🍫","Bars, bites and shareable treats"),
  snack("popcorn","Popcorn","popcorn","🍿","Movie-night favourites"),
  snack("drinks","Cold drinks","cold drinks","🥤","Something cool to go with your snacks"),
  snack("ice-cream","Ice cream","ice cream","🍦","Frozen treats in different sizes"),
  snack("nuts","Nuts & dry fruits","nuts dry fruits","🥜","Find the exact mix and pack you want"),
];

/** Local clock suggests a meal period. Explicit choices always take precedence. */
export function mealPeriodAt(now:Date,timezone:string):Discovery["mealPeriod"]{
  let hour:number;
  try{hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:timezone,hour:"2-digit",hourCycle:"h23"}).format(now));}
  catch{hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",hour:"2-digit",hourCycle:"h23"}).format(now));}
  return hour>=5&&hour<11?"breakfast":hour>=11&&hour<17?"lunch":"dinner";
}
export function categoriesFor(discovery:Pick<Discovery,"kind"|"mealPeriod">):readonly DiscoveryCategory[]{
  return discovery.kind==="snacks"?snacks:discovery.mealPeriod==="breakfast"?breakfast:mains;
}
const normalized=(text:string)=>text.toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9]+/g," ").trim();
const aliases:Record<string,string[]>={
  biryani:["biryanis","biriyani","birayni"],pizza:["pizzas"],thalis:["thali"],parathas:["paratha"],burgers:["burger"],sandwiches:["sandwich"],
  poha:["poha","upma"],chips:["chips","crisps"],biscuits:["biscuits","cookies","biscuit","cookie"],chocolates:["chocolate"],drinks:["drinks","soft drinks"],nuts:["nuts","dry fruits"],
};
export function findCategory(text:string,discovery:Pick<Discovery,"kind"|"mealPeriod">):DiscoveryCategory|undefined{
  const value=normalized(text).replace(/^(?:please |show me |show |i want |i wanna |id like |lets have |browse |search |order |category )+/g,"").replace(/ (?:please|category)$/g,"");
  return categoriesFor(discovery).find(category=>[category.id,category.label,...(aliases[category.id]??[])].some(label=>normalized(label)===value));
}
