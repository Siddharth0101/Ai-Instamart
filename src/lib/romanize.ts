/**
 * Hindi transcripts arrive in Devanagari while every command grammar in the app is Latin. Romanizing
 * to the Hinglish spellings those grammars already accept lets one grammar serve both scripts.
 * Purchase-confirmation words ("this", "दिस") are deliberately absent from the lexicon: placing an
 * order stays an exact English phrase that no Devanagari sentence can romanize into.
 */
const DEVANAGARI=/[ऀ-ॿ꣠-ꣿ᳐-᳿]/;
const LETTER='\\u0900-\\u0963\\u0971-\\u097F\\uA8E0-\\uA8FF\\u1CD0-\\u1CFF';
const WORD=new RegExp(`[${LETTER}](?:[${LETTER}\\u200C\\u200D]*[${LETTER}])?`,'g');
export const hasDevanagari=(text:string)=>DEVANAGARI.test(text);

const lexicon:Record<string,string>={
  zero:'ज़ीरो शून्य',ek:'एक',do:'दो',teen:'तीन',chaar:'चार',paanch:'पांच पाँच',chhe:'छह छः छे',saat:'सात',aath:'आठ',nau:'नौ',das:'दस',gyarah:'ग्यारह',barah:'बारह',
  pandrah:'पंद्रह पन्द्रह',bees:'बीस',pachaas:'पचास',sau:'सौ',hazaar:'हज़ार हजार',aadha:'आधा',pehla:'पहला',pehli:'पहली',pehle:'पहले',dusra:'दूसरा दुसरा',dusri:'दूसरी दुसरी',
  dusre:'दूसरे दुसरे',teesra:'तीसरा',teesri:'तीसरी',teesre:'तीसरे',chautha:'चौथा',chauthi:'चौथी',chauthe:'चौथे',paanchva:'पांचवां पांचवा',paanchvi:'पांचवीं पांचवी',
  aakhri:'आखिरी आख़िरी',one:'वन',two:'टू',three:'थ्री',four:'फोर फ़ोर',five:'फाइव फ़ाइव',first:'फर्स्ट फ़र्स्ट',second:'सेकंड सेकेंड सेकण्ड',third:'थर्ड',last:'लास्ट',
  next:'नेक्स्ट',number:'नंबर नम्बर',
  haan:'हां',haanji:'हांजी',ji:'जी',nahi:'नहीं नही',na:'ना',mat:'मत',theek:'ठीक',achha:'अच्छा',achhi:'अच्छी',achhe:'अच्छे',sahi:'सही',bilkul:'बिल्कुल बिलकुल',
  zaroor:'ज़रूर जरूर',ok:'ओके',yes:'यस येस',no:'नो',please:'प्लीज़ प्लीज',sorry:'सॉरी',thanks:'थैंक्स',thank:'थैंक',you:'यू',hello:'हेलो हैलो',hi:'हाय ही',bhai:'भाई',
  yaar:'यार',zara:'ज़रा जरा',bas:'बस',ruko:'रुको',ruk:'रुक',rukiye:'रुकिए रुकिये',roko:'रोको',band:'बंद बन्द',karo:'करो',kar:'कर',karen:'करें',karna:'करना',
  karni:'करनी',kijiye:'कीजिए कीजिये',kariye:'करिए करिये',kardo:'करदो',de:'दे',dijiye:'दीजिए दीजिये',dena:'देना',dedo:'देदो',kholo:'खोलो',khol:'खोल',
  kholiye:'खोलिए खोलिये',kholen:'खोलें',dikhao:'दिखाओ दिखाओं',dikha:'दिखा',dikhaiye:'दिखाइए दिखाइये',dikhana:'दिखाना',hatao:'हटाओ',hata:'हटा',hataiye:'हटाइए हटाइये',
  nikaal:'निकाल',nikaalo:'निकालो',daal:'डाल',daalo:'डालो',jao:'जाओ',ja:'जा',jaiye:'जाइए जाइये',chalo:'चलो',chaliye:'चलिए चलिये',batao:'बताओ',bata:'बता',
  bataiye:'बताइए बताइये',bolo:'बोलो',boliye:'बोलिए बोलिये',sunao:'सुनाओ',phir:'फिर फ़िर',dobara:'दोबारा दुबारा',baar:'बार',lao:'लाओ',le:'ले',lo:'लो',
  mangao:'मंगाओ मंगवाओ',chahiye:'चाहिए चाहिये',chahta:'चाहता',chahti:'चाहती',hai:'है',hain:'हैं',hun:'हूं',tha:'था',mujhe:'मुझे',mujhko:'मुझको',
  humein:'हमें',hum:'हम',main:'मैं',mera:'मेरा',meri:'मेरी',mere:'मेरे',apna:'अपना',aap:'आप',tum:'तुम',liye:'लिए लिये',ko:'को',ka:'का',ki:'की',ke:'के',
  mein:'में मे',se:'से',par:'पर',pe:'पे',tak:'तक',aur:'और',ya:'या',bhi:'भी',to:'तो',kya:'क्या',kaun:'कौन',kaunsa:'कौनसा',kitna:'कितना',kahan:'कहां',ye:'ये',
  yeh:'यह',wo:'वो',woh:'वह',is:'इस',isko:'इसको',ise:'इसे',usko:'उसको',use:'उसे',yahan:'यहां',yahi:'यही',wala:'वाला',wali:'वाली',wale:'वाले',sab:'सब',
  saare:'सारे',sabhi:'सभी',kuch:'कुछ',thoda:'थोड़ा थोडा',thodi:'थोड़ी थोडी',zyada:'ज़्यादा ज्यादा',kam:'कम',bahut:'बहुत',abhi:'अभी',jaldi:'जल्दी',sirf:'सिर्फ़ सिर्फ',
  akela:'अकेला',neeche:'नीचे निचे',upar:'ऊपर उपर',wapas:'वापस',peeche:'पीछे पिछे',aage:'आगे',paas:'पास',log:'लोग',logon:'लोगों',bachche:'बच्चे',bade:'बड़े बडे',
  aaj:'आज',kal:'कल',raat:'रात',shaam:'शाम',subah:'सुबह',baje:'बजे',rupaye:'रुपये रुपए रूपए रूपये',budget:'बजट',limit:'लिमिट',koi:'कोई',khana:'खाना',
  nashta:'नाश्ता',
  biryani:'बिरयानी बिरियानी',paneer:'पनीर',pizza:'पिज़्ज़ा पिज्जा पिज़ा',burger:'बर्गर',chicken:'चिकन',mutton:'मटन',egg:'एग',anda:'अंडा',veg:'वेज वैज',
  'non veg':'नॉनवेज नानवेज',non:'नॉन',dosa:'डोसा दोसा',idli:'इडली',samosa:'समोसा',momos:'मोमोज़ मोमोज',momo:'मोमो',thali:'थाली',roti:'रोटी',naan:'नान',
  dal:'दाल',chawal:'चावल',rice:'राइस',chai:'चाय',coffee:'कॉफ़ी कॉफी',chips:'चिप्स',biscuit:'बिस्किट बिस्कुट',biscuits:'बिस्किट्स',cold:'कोल्ड',drink:'ड्रिंक',
  drinks:'ड्रिंक्स',juice:'जूस',milk:'मिल्क',doodh:'दूध',paani:'पानी','ice cream':'आइसक्रीम आइस्क्रीम',ice:'आइस',cream:'क्रीम',cake:'केक',mithai:'मिठाई',
  namkeen:'नमकीन',chocolate:'चॉकलेट चोकलेट',pasta:'पास्ता',noodles:'नूडल्स',chowmein:'चाउमीन चाऊमीन',manchurian:'मंचूरियन मंचुरियन',fried:'फ्राइड फ़्राइड',
  sandwich:'सैंडविच सेंडविच',roll:'रोल',rolls:'रोल्स',tikka:'टिक्का',kebab:'कबाब',butter:'बटर',masala:'मसाला',tandoori:'तंदूरी तन्दूरी',kadhai:'कढ़ाई कढ़ाही',
  makhani:'मखनी',curry:'करी',paratha:'पराठा परांठा',chole:'छोले',bhature:'भटूरे',rajma:'राजमा',pav:'पाव',bhaji:'भाजी',vada:'वड़ा वडा',pakoda:'पकौड़ा पकोड़ा',
  khichdi:'खिचड़ी खिचडी',salad:'सलाद',soup:'सूप',fries:'फ्राइज़ फ्राइज',french:'फ्रेंच',garlic:'गार्लिक',bread:'ब्रेड',lassi:'लस्सी',raita:'रायता',aloo:'आलू',
  gobi:'गोभी',mushroom:'मशरूम',cheese:'चीज़ चीज',spicy:'स्पाइसी',teekha:'तीखा',combo:'कॉम्बो',meal:'मील',plate:'प्लेट',piece:'पीस',packet:'पैकेट',pack:'पैक',
  bottle:'बोतल बॉटल',half:'हाफ',full:'फुल',extra:'एक्स्ट्रा',snacks:'स्नैक्स',snack:'स्नैक',party:'पार्टी',breakfast:'ब्रेकफास्ट',lunch:'लंच',dinner:'डिनर',
  food:'फूड',foods:'फूड्स',house:'हाउस',kitchen:'किचन',cafe:'कैफे कैफ़े',
  restaurant:'रेस्टोरेंट रेस्तरां रेस्टॉरेंट रेस्टोरेन्ट रेस्टोरंट रेस्टुरेंट',restaurants:'रेस्टोरेंट्स रेस्टॉरेंट्स रेस्टोरेन्ट्स',hotel:'होटल',menu:'मेनू मेन्यू मैन्यू मेनु',
  order:'ऑर्डर आर्डर ऑडर',cart:'कार्ट',bag:'बैग',scroll:'स्क्रॉल स्क्रोल',add:'ऐड एड',remove:'रिमूव रिमुव',delete:'डिलीट',select:'सेलेक्ट सिलेक्ट',choose:'चूज़',
  open:'ओपन',close:'क्लोज़ क्लोज',back:'बैक',more:'मोर',show:'शो',search:'सर्च',review:'रिव्यू रीव्यू',checkout:'चेकआउट',check:'चेक',plan:'प्लान',
  place:'प्लेस',confirm:'कन्फर्म कंफर्म',cancel:'कैंसल कैंसिल',stop:'स्टॉप',item:'आइटम',items:'आइटम्स',dish:'डिश',option:'ऑप्शन',options:'ऑप्शंस ऑप्शन्स',
  choice:'चॉइस',choices:'चॉइसेस',list:'लिस्ट',section:'सेक्शन',category:'कैटेगरी',payment:'पेमेंट',address:'एड्रेस',delivery:'डिलीवरी',total:'टोटल',
  bill:'बिल',price:'प्राइस',rating:'रेटिंग',filter:'फ़िल्टर फिल्टर',sort:'सॉर्ट',mic:'माइक',voice:'वॉयस वॉइस',off:'ऑफ',swiggy:'स्विगी',zomato:'ज़ोमैटो',
  instamart:'इंस्टामार्ट',
};
const lookupKey=(word:string)=>word.normalize('NFC').replace(/[़‌‍]/g,'').replace(/ँ/g,'ं');
const words=new Map(Object.entries(lexicon).flatMap(([latin,spellings])=>spellings.split(' ').map(spelling=>[lookupKey(spelling),latin] as const)));

const consonants:Record<string,string>={'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'n','च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ñ','ट':'t','ठ':'th','ड':'d','ढ':'dh',
  'ण':'n','त':'t','थ':'th','द':'d','ध':'dh','न':'n','ऩ':'n','प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ऱ':'r','ल':'l','ळ':'l','ऴ':'zh','व':'v',
  'श':'sh','ष':'sh','स':'s','ह':'h','ॸ':'d','ॹ':'zh','ॺ':'y','ॻ':'g','ॼ':'j','ॾ':'d','ॿ':'b'};
const nukta:Record<string,string>={'क':'k','ख':'kh','ग':'g','ज':'z','झ':'z','ड':'r','ढ':'rh','फ':'f','य':'y'};
// Upper-case keys mark long vowels whose Hinglish spelling depends on position.
const signs:Record<string,string>={'ा':'A','ि':'i','ी':'I','ु':'u','ू':'U','ृ':'ri','ॄ':'ri','ॅ':'e','ॆ':'e','े':'e','ै':'ai','ॉ':'o','ॊ':'o','ो':'o','ौ':'au',
  'ॎ':'e','ॏ':'au','ॕ':'e','ॖ':'u','ॗ':'U','ॢ':'li','ॣ':'li'};
const vowels:Record<string,string>={'ऄ':'a','अ':'a','आ':'A','इ':'i','ई':'I','उ':'u','ऊ':'U','ऋ':'ri','ॠ':'ri','ऌ':'li','ॡ':'li','ऍ':'e','ऎ':'e','ए':'e','ऐ':'ai',
  'ऑ':'o','ऒ':'o','ओ':'o','औ':'au','ॲ':'a','ॳ':'a','ॴ':'A','ॵ':'au','ॶ':'u','ॷ':'U'};
/** c: consonant ('' for a free vowel); v: '@' inherent schwa, '' none, else a vowel key; n: anusvara 'ṃ' or chandrabindu 'n'. */
type Unit={c:string;v:string;n:string;h:boolean};

function units(word:string):Unit[] {
  const out:Unit[]=[];
  for(let i=0;i<word.length;i++){
    const ch=word[i],last=out.at(-1);
    if(ch in consonants){
      let c=consonants[ch];
      if(word[i+1]==='़'){c=nukta[ch]??c;i++;}
      const next=word[i+1];
      if(next==='्'){out.push({c,v:'',n:'',h:false});i++;}
      else if(next in signs){out.push({c,v:signs[next],n:'',h:false});i++;}
      else out.push({c,v:'@',n:'',h:false});
    }else if(ch in vowels||ch in signs)out.push({c:'',v:vowels[ch]??signs[ch],n:'',h:false});
    else if(ch==='ं'||ch==='ँ'||ch==='ऀ'){const n=ch==='ं'?'ṃ':'n';if(last)last.n=n;else out.push({c:'',v:'',n,h:false});}
    else if(ch==='ः'){if(last)last.h=true;}
    else if(ch==='ॐ')out.push({c:'',v:'om',n:'',h:false});
  }
  return out;
}

/** Hindi drops the inherent vowel word-finally and in V C _ C V contexts (right to left); “करना” is karna, not karana. */
function transliterate(word:string):string {
  const u=units(word),last=u.length-1;
  const sounded=(x:Unit)=>x.v!=='';
  const deletable=(x:Unit)=>x.c!==''&&x.v==='@'&&!x.n&&!x.h;
  const cluster=last>0&&u[last-1].c!==''&&u[last-1].v==='';
  if(last>0&&deletable(u[last])&&u.slice(0,last).some(sounded)&&!(cluster&&/^[ryv]$/.test(u[last].c)))u[last].v='';
  for(let i=last-1;i>0;i--)if(deletable(u[i])&&sounded(u[i-1])&&u[i+1].c&&sounded(u[i+1]))u[i].v='';
  const nuclei=u.filter(sounded).length;
  return u.map((x,i)=>{
    const prev=u[i-1],next=u[i+1];
    let c=x.c;
    if(c==='v'&&prev?.c&&prev.v==='')c='w';
    else if(c==='ch'&&x.v===''&&next?.c==='chh')c='';
    else if(c==='j'&&x.v===''&&next?.c==='ñ')c='g';
    else if(c==='ñ')c=prev?.c==='j'&&prev.v===''?'y':'n';
    const v=x.v==='@'?(next?.c==='h'&&next.v===''?'e':'a'):x.v==='A'?(nuclei===1||(i===0&&!x.c)?'aa':'a'):x.v==='I'?(i===last?'i':'ee')
      :x.v==='U'?(i===last?'u':'oo'):x.v==='e'&&!x.c&&prev&&sounded(prev)?'ye':x.v;
    const nasal=x.n==='ṃ'?(/^(?:p|ph|b|bh|m)$/.test(next?.c??'')?'m':'n'):x.n;
    return c+v+nasal+(x.h?'h':'');
  }).join('');
}

/** Devanagari words become Hinglish Latin (“Behrouz Biryani का मेनू खोलो” → “Behrouz Biryani ka menu kholo”); Latin text is returned unchanged. */
export function romanize(text:string):string {
  if(!hasDevanagari(text))return text;
  const spaced=/[\p{L}\p{N}]/u;
  return text.replace(/[०-९]/g,digit=>String(digit.charCodeAt(0)-0x966)).replace(/[।॥॰]/g,'.').replace(WORD,(word:string,offset:number,whole:string)=>{
    const normal=word.normalize('NFC'),latin=words.get(lookupKey(normal))??transliterate(normal);
    return (offset>0&&spaced.test(whole[offset-1])?' ':'')+latin+(spaced.test(whole[offset+word.length]??'')?' ':'');
  });
}

/** A loose consonant skeleton, so a romanized name (“behrooz biryani”) can meet its English spelling (“Behrouz Biryani”). */
export function soundKey(text:string):string {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g,'').replace(/tch/g,'ch').replace(/ph/g,'f').replace(/ck|q/g,'k').replace(/c(?!h)/g,'k').replace(/x/g,'ks')
    .replace(/w/g,'v').replace(/z/g,'s').replace(/([bdgjkt])h/g,'$1').replace(/[aeiouy]+/g,'').replace(/([a-z])\1+/g,'$1').replace(/\s+/g,' ').trim();
}
/** Sound-alike candidates for a romanized spoken name: whole-key matches first, else names whose words start with the spoken key. */
export function soundsLike<T>(spoken:string,candidates:readonly T[],name:(candidate:T)=>string):T[] {
  const key=soundKey(spoken);
  if(key.replace(/ /g,'').length<3)return [];
  const keys=candidates.map(candidate=>soundKey(name(candidate)));
  const whole=candidates.filter((_,index)=>keys[index]===key);
  return whole.length?whole:candidates.filter((_,index)=>` ${keys[index]}`.includes(` ${key}`));
}
