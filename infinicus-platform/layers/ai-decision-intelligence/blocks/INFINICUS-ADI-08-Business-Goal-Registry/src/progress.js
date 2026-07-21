export function inferDirection(baseline,target){return target>baseline?"increase":target<baseline?"decrease":"maintain"}
export function calculateProgress({baselineValue,currentValue,targetValue,direction=inferDirection(baselineValue,targetValue),tolerance=0}){
 let raw=0;
 if(direction==="increase"){const range=targetValue-baselineValue;raw=range<=0?0:(currentValue-baselineValue)/range*100}
 else if(direction==="decrease"){const range=baselineValue-targetValue;raw=range<=0?0:(baselineValue-currentValue)/range*100}
 else raw=Math.abs(currentValue-targetValue)<=Math.abs(tolerance)?100:0;
 return Math.round(Math.max(0,Math.min(100,raw))*100)/100;
}
