import type { Address, Cart, Payment, Product } from "../lib/contracts";
export const demoProducts:Product[]=[
  {id:"demo-milk",name:"Fresh Toned Milk",brand:"Amul",unit:"500 ml",priceMinor:2900,currency:"INR",available:true},
  {id:"demo-oat-milk",name:"Oat Milk",brand:"Oat & Co.",unit:"1 litre",priceMinor:19900,currency:"INR",available:true},
  {id:"demo-banana",name:"Banana Robusta",brand:"Fresh harvest",unit:"6 pieces",priceMinor:4900,currency:"INR",available:true},
  {id:"demo-bread",name:"Whole Wheat Bread",brand:"Daily loaf",unit:"400 g",priceMinor:5500,currency:"INR",available:true},
  {id:"demo-eggs",name:"Farm Fresh Eggs",brand:"Morning farm",unit:"6 pieces",priceMinor:7900,currency:"INR",available:true},
  {id:"demo-tomato",name:"Fresh Tomatoes",brand:"Fresh harvest",unit:"500 g",priceMinor:3500,currency:"INR",available:true},
  {id:"demo-atta",name:"Whole Wheat Atta",brand:"Aashirvaad",unit:"5 kg",priceMinor:27500,currency:"INR",available:true},
  {id:"demo-coffee",name:"Classic Instant Coffee",brand:"Nescafé",unit:"50 g",priceMinor:18500,currency:"INR",available:true}
];
export const demoAddresses:Address[]=[{id:"demo-home",label:"Demo home · Bengaluru",reviewAddressText:"Flat 12, Example Apartments, Example Road, Bengaluru, Karnataka 560001 (synthetic address)"}];
export const demoPayments:Payment[]=[{id:"demo-cod",label:"Demo cash on delivery (no payment taken)"}];
export function calculateCart(lines:Cart["lines"],revision:number):Cart {
  const itemsMinor=lines.reduce((sum,line)=>sum+line.product.priceMinor*line.quantity,0);
  const feesMinor=lines.length ? (itemsMinor>=29900 ? 0:2500):0;
  return {revision,lines,totals:{itemsMinor,feesMinor,discountMinor:0,totalMinor:itemsMinor+feesMinor,currency:"INR"}};
}
export function searchDemo(query:string):Product[] {
  const words=query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).filter(w=>w.length>1&&!['find','show','please','some','buy','add','want','need','the','me','of','get'].includes(w)&&!/^\d+$/.test(w));
  return words.length?demoProducts.filter(p=>words.some(w=>{
    const productText=`${p.name} ${p.brand} ${p.unit}`.toLowerCase();
    const singular=w==="tomatoes"?"tomato":w.length>3&&w.endsWith("s")?w.slice(0,-1):w;
    return productText.includes(w)||productText.includes(singular);
  })):demoProducts;
}
