import {normalizeVoice} from './spoken-match';
import {hasDevanagari,romanize} from './romanize';

export type ScrollDirection='up'|'down'|'stop';
/** Exact navigation commands only: “stop adding” must never mean “scroll”. */
export function scrollCommand(raw:string):ScrollDirection|null {
  const text=normalizeVoice(hasDevanagari(raw)?romanize(raw):raw).replace(/^please /,'').replace(/ please$/,'');
  if(/^(stop|stop here|stop now|stop scrolling|stop scroll|pause scrolling|ruk jao|ruko|yahi ruko|bas|scroll band karo|रुको|बस)$/.test(text))return 'stop';
  if(/^(scroll|scroll(?: (?:the )?(?:menu|page))? down|scroll down(?: (?:the )?(?:menu|page))?|neeche(?: scroll)?(?: karo| jao)?|niche scroll karo|नीचे स्क्रॉल करो)$/.test(text))return 'down';
  if(/^(scroll(?: (?:the )?(?:menu|page))? up|scroll up(?: (?:the )?(?:menu|page))?|upar(?: scroll)?(?: karo| jao)?|ऊपर स्क्रॉल करो)$/.test(text))return 'up';
  return null;
}

type ScrollDependencies={
  requestFrame(callback:(time:number)=>void):number;
  cancelFrame(id:number):void;
  move(pixels:number):boolean;
  onChange(direction:ScrollDirection):void;
  reducedMotion?():boolean;
  pageSize?():number;
};
/** One cancellable animation at a time; reaching a boundary stops the loop. */
export function createVoiceScroller(deps:ScrollDependencies){
  let frame:number|null=null,epoch=0,direction:ScrollDirection='stop';
  function stop(){epoch++;if(frame!==null)deps.cancelFrame(frame);frame=null;if(direction!=='stop'){direction='stop';deps.onChange('stop');}}
  function start(next:ScrollDirection){
    stop();if(next==='stop')return;
    if(deps.reducedMotion?.()){
      deps.move((next==='down'?1:-1)*Math.max(1,deps.pageSize?.()??360));
      return;
    }
    direction=next;deps.onChange(next);const run=++epoch;let previous:number|null=null,started:number|null=null;
    const tick=(time:number)=>{
      if(run!==epoch)return;
      frame=null;started??=time;
      const elapsed=previous===null?0:Math.min(64,time-previous);previous=time;
      if(time-started>=60_000||(elapsed>0&&!deps.move((next==="down"?1:-1)*elapsed*.22))){stop();return;}
      frame=deps.requestFrame(tick);
    };
    frame=deps.requestFrame(tick);
  }
  return {start,stop};
}
