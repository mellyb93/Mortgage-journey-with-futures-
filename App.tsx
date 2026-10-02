import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type EventType = "lump" | "monthly";
type Effect = "payment" | "term";
type TransactionType = "purchase" | "remortgage";
type BuyerType = "ftb" | "moving" | "additional";
type Event = { id: string; type: EventType; amount: number; start: string; end?: string; effect: Effect };
type Mortgage = {
  id: string; name: string; propertyId: string; propertyName: string; transaction: TransactionType;
  start: string; end?: string; balance: number; rate: number; term: number; payment: number;
  observed?: number; erc?: number; purchasePrice?: number; stampDuty?: number; fees?: number; additionalCash?: number; equityFromPrevious?: number; buyerType?: BuyerType;
  events: Event[];
};
type Valuation = { date: string; propertyId: string; value: number };
type TrackerPoint = { date: string; bankRate: number };
type RentStage = { id: string; propertyId: string; name: string; start: string; end?: string; monthlyRent: number; annualGrowth: number; source: string };
type MorgData = { mortgages: Mortgage[]; valuations: Valuation[]; benchmark: number; trackerMargin: number; trackerData: TrackerPoint[]; rentStages: RentStage[] };
type Point = { date: string; balance: number; interest: number; extra: number; propertyId: string };

// Monthly end-of-month Bank Rate observations for the prototype tracker counterfactual.
// Source: Bank of England official Bank Rate history. The app treats each month as having
// the Bank Rate in force at month-end, then adds the user's chosen tracker margin.
const TRACKER_DATES = [
  ["2018-05-01",0.5],
  ["2018-06-01",0.5],
  ["2018-07-01",0.5],
  ["2018-08-01",0.75],
  ["2018-09-01",0.75],
  ["2018-10-01",0.75],
  ["2018-11-01",0.75],
  ["2018-12-01",0.75],
  ["2019-01-01",0.75],
  ["2019-02-01",0.75],
  ["2019-03-01",0.75],
  ["2019-04-01",0.75],
  ["2019-05-01",0.75],
  ["2019-06-01",0.75],
  ["2019-07-01",0.75],
  ["2019-08-01",0.75],
  ["2019-09-01",0.75],
  ["2019-10-01",0.75],
  ["2019-11-01",0.75],
  ["2019-12-01",0.75],
  ["2020-01-01",0.75],
  ["2020-02-01",0.75],
  ["2020-03-01",0.1],
  ["2020-04-01",0.1],
  ["2020-05-01",0.1],
  ["2020-06-01",0.1],
  ["2020-07-01",0.1],
  ["2020-08-01",0.1],
  ["2020-09-01",0.1],
  ["2020-10-01",0.1],
  ["2020-11-01",0.1],
  ["2020-12-01",0.1],
  ["2021-01-01",0.1],
  ["2021-02-01",0.1],
  ["2021-03-01",0.1],
  ["2021-04-01",0.1],
  ["2021-05-01",0.1],
  ["2021-06-01",0.1],
  ["2021-07-01",0.1],
  ["2021-08-01",0.1],
  ["2021-09-01",0.1],
  ["2021-10-01",0.1],
  ["2021-11-01",0.1],
  ["2021-12-01",0.25],
  ["2022-01-01",0.25],
  ["2022-02-01",0.5],
  ["2022-03-01",0.75],
  ["2022-04-01",0.75],
  ["2022-05-01",1],
  ["2022-06-01",1.25],
  ["2022-07-01",1.25],
  ["2022-08-01",1.75],
  ["2022-09-01",2.25],
  ["2022-10-01",2.25],
  ["2022-11-01",3],
  ["2022-12-01",3.5],
  ["2023-01-01",3.5],
  ["2023-02-01",4],
  ["2023-03-01",4.25],
  ["2023-04-01",4.25],
  ["2023-05-01",4.5],
  ["2023-06-01",5],
  ["2023-07-01",5],
  ["2023-08-01",5.25],
  ["2023-09-01",5.25],
  ["2023-10-01",5.25],
  ["2023-11-01",5.25],
  ["2023-12-01",5.25],
  ["2024-01-01",5.25],
  ["2024-02-01",5.25],
  ["2024-03-01",5.25],
  ["2024-04-01",5.25],
  ["2024-05-01",5.25],
  ["2024-06-01",5.25],
  ["2024-07-01",5.25],
  ["2024-08-01",5],
  ["2024-09-01",5],
  ["2024-10-01",5],
  ["2024-11-01",4.75],
  ["2024-12-01",4.75],
  ["2025-01-01",4.75],
  ["2025-02-01",4.5],
  ["2025-03-01",4.5],
  ["2025-04-01",4.5],
  ["2025-05-01",4.25],
  ["2025-06-01",4.25],
  ["2025-07-01",4.25],
  ["2025-08-01",4],
  ["2025-09-01",4],
  ["2025-10-01",4],
  ["2025-11-01",4],
  ["2025-12-01",3.75],
  ["2026-01-01",3.75],
  ["2026-02-01",3.75],
  ["2026-03-01",3.75],
  ["2026-04-01",3.75],
  ["2026-05-01",3.75],
  ["2026-06-01",3.75],
  ["2026-07-01",3.75],
  ["2026-08-01",3.75],
  ["2026-09-01",3.75]
] as const;
const DEMO:MorgData={
  mortgages:[
    {id:"m1",name:"First home — original mortgage",propertyId:"p1",propertyName:"First house",transaction:"purchase",start:"2018-05-01",end:"2020-11-01",balance:300000,rate:2.5,term:35,payment:1075,observed:286000,erc:8000,purchasePrice:350000,stampDuty:2500,fees:0,buyerType:"ftb",events:[]},
    {id:"m2",name:"Second home — purchase mortgage",propertyId:"p2",propertyName:"Second house",transaction:"purchase",start:"2021-01-01",end:"2025-09-01",balance:400000,rate:2,term:35,payment:1330,observed:362000,purchasePrice:525000,stampDuty:2000,fees:0,additionalCash:20000,equityFromPrevious:110000,buyerType:"moving",events:[]},
    {id:"m3",name:"Second home — remortgage",propertyId:"p2",propertyName:"Second house",transaction:"remortgage",start:"2025-09-01",balance:360000,rate:4,term:30,payment:1700,observed:325000,events:[{id:"e1",type:"lump",amount:25000,start:"2025-10-01",effect:"payment"}]}
  ],
  valuations:[{date:"2021-01-01",propertyId:"p2",value:525000},{date:"2025-09-01",propertyId:"p2",value:575000},{date:"2026-09-01",propertyId:"p2",value:600000},{date:"2020-11-01",propertyId:"p1",value:400000}],
  benchmark:75,trackerMargin:1.0,trackerData:TRACKER_DATES.map(([date,bankRate])=>({date,bankRate})),
  rentStages:[
    {id:"r1",propertyId:"p1",name:"Horley semi-detached",start:"2018-05-01",end:"2020-11-01",monthlyRent:1400,annualGrowth:3.0,source:"ONS-anchored estimate: Reigate & Banstead semi-detached benchmark, back-cast from Aug 2026 at 3% p.a."},
    {id:"r2",propertyId:"p2",name:"Shermanbury 3-bed detached",start:"2021-01-01",monthlyRent:1800,annualGrowth:3.0,source:"ONS-anchored estimate: Horsham detached benchmark, back-cast from Aug 2026 at 3% p.a."}
  ]
};

const money=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(n);
const dateFmt=(s?:string)=>s?new Intl.DateTimeFormat("en-GB",{month:"short",year:"numeric"}).format(new Date(s+"T12:00:00")):"—";
const addMonth=(s:string)=>{const d=new Date(s+"T12:00:00");d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,10)};
const monthsBetween=(a:string,b:string)=>{const x=new Date(a+"T12:00:00"),y=new Date(b+"T12:00:00");return Math.max(1,(y.getFullYear()-x.getFullYear())*12+y.getMonth()-x.getMonth()+1)};
const paymentFor=(b:number,r:number,n:number)=>r===0?b/n:b*(r/1200)/(1-Math.pow(1+r/1200,-n));

function simulate(m:Mortgage,events=true,until?:string):{points:Point[],interest:number,months:number,extra:number}{
  let b=m.balance,p=m.payment,totalI=0,extra=0,date=m.start; const pts:Point[]=[]; const stop=until||m.end;
  for(let i=0;i<480&&b>.01&&(!stop||date<=stop);i++){
    const interest=b*m.rate/1200; const principal=Math.min(b,Math.max(0,p-interest)); b-=principal;
    let ex=0;
    if(events){
      for(const e of m.events.filter(e=>e.type==="lump"&&e.start.slice(0,7)===date.slice(0,7))){
        const x=Math.min(b,Math.max(0,e.amount));b-=x;ex+=x;extra+=x;
        if(e.effect==="payment"&&b>.01)p=paymentFor(b,m.rate,Math.max(1,m.term*12-i-1));
      }
      for(const e of m.events.filter(e=>e.type==="monthly"&&date>=e.start&&date<=(e.end||e.start))){const x=Math.min(b,Math.max(0,e.amount));b-=x;ex+=x;extra+=x;}
      if(m.events.some(e=>e.type==="monthly"&&e.effect==="payment"&&e.end?.slice(0,7)===date.slice(0,7))&&b>.01)p=paymentFor(b,m.rate,Math.max(1,m.term*12-i-1));
    }
    totalI+=interest;pts.push({date,balance:Math.max(0,b),interest,extra:ex,propertyId:m.propertyId}); if(b<=.01)break; date=addMonth(date);
  }
  return {points:pts,interest:totalI,months:pts.length,extra};
}

function propertyValueAt(vals:Valuation[],propertyId:string,date:string){
  const v=vals.filter(x=>x.propertyId===propertyId).sort((a,b)=>a.date.localeCompare(b.date)); if(!v.length)return undefined;
  if(date<=v[0].date)return v[0].value;if(date>=v.at(-1)!.date)return v.at(-1)!.value;
  for(let i=0;i<v.length-1;i++){if(date>=v[i].date&&date<=v[i+1].date){const a=new Date(v[i].date).getTime(),b=new Date(v[i+1].date).getTime(),x=new Date(date).getTime();return v[i].value+(v[i+1].value-v[i].value)*(x-a)/(b-a)}}
}

function Chart({series,xLabel,yLabel,format=(x:number)=>money(x),percent=false,markers=[]}:{series:{name:string;points:{date:string,value:number}[]}[],xLabel:string,yLabel:string,format?:(x:number)=>string,percent?:boolean,markers?:{date:string;label:string}[]}){
  const all=series.flatMap(s=>s.points.map(p=>p.value));if(!all.length)return <div className="empty">No chart data.</div>;
  const min=Math.min(0,...all),max=Math.max(...all),range=max-min||1,w=760,h=300,left=72,right=18,top=24,bottom=58;
  const start=Math.min(...series.flatMap(s=>s.points.map(p=>new Date(p.date).getTime()))),end=Math.max(...series.flatMap(s=>s.points.map(p=>new Date(p.date).getTime())));
  const x=(date:string)=>left+((new Date(date).getTime()-start)/Math.max(1,end-start))*(w-left-right);
  const y=(value:number)=>top+(max-value)/range*(h-top-bottom);
  const path=(pts:{date:string,value:number}[])=>pts.map((p,i)=>`${i?"L":"M"} ${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const yTicks=[max,max-(range*.25),max-(range*.5),max-(range*.75),min];
  const xTicks=[start,start+(end-start)/2,end];
  return <div className="chart"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${yLabel} chart`}>
    {yTicks.map((v,i)=><g key={i}><line x1={left} x2={w-right} y1={y(v)} y2={y(v)} className="grid"/><text x={left-10} y={y(v)+4} textAnchor="end">{format(v)}</text></g>)}
    {xTicks.map((v,i)=><g key={i}><line x1={left+((v-start)/Math.max(1,end-start))*(w-left-right)} x2={left+((v-start)/Math.max(1,end-start))*(w-left-right)} y1={top} y2={h-bottom} className="grid vertical"/><text x={left+((v-start)/Math.max(1,end-start))*(w-left-right)} y={h-bottom+24} textAnchor={i===0?"start":i===2?"end":"middle"}>{new Date(v).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}</text></g>)}
    {markers.filter(m=>new Date(m.date).getTime()>=start&&new Date(m.date).getTime()<=end).map((m,i)=>{const mx=x(m.date);return <g key={`marker-${i}`}><line x1={mx} x2={mx} y1={top} y2={h-bottom} className="marker"/><text x={mx+5} y={top+12+(i%2)*14} className="marker-label">{m.label}</text></g>})}
    <line x1={left} x2={left} y1={top} y2={h-bottom} className="axis"/><line x1={left} x2={w-right} y1={h-bottom} y2={h-bottom} className="axis"/>
    {series.map((s,i)=><path key={s.name} d={path(s.points)} className={`line ${i%3===0?"one":i%3===1?"two":"three"}`} fill="none"/>) }
    <text x={18} y={top} className="axis-label" transform={`rotate(-90 18 ${top})`}>{yLabel}</text><text x={(left+w-right)/2} y={h-8} textAnchor="middle" className="axis-label">{xLabel}</text>
  </svg><div className="legend">{series.map((s,i)=><span key={s.name}><i className={`dot ${i%3===0?"one":i%3===1?"two":"three"}`}/> {s.name}</span>)}</div></div>
}

function stampDutyEstimate(price:number,buyerType:BuyerType,date:string){
  const d=date;
  const bandTax=(bands:[number,number][])=>{let tax=0;let prev=0;for(const [limit,rate] of bands){if(price>prev)tax+=(Math.min(price,limit)-prev)*rate;if(price<=limit)break;prev=limit;}return Math.max(0,tax);};
  if(buyerType==='ftb'){
    if(d>='2021-07-01' && d<='2022-09-22' && price<=500000) return Math.max(0,(price-300000)*0.05);
    if(d>='2022-09-23' && d<='2025-03-31' && price<=625000) return Math.max(0,(price-425000)*0.05);
    if(d>='2025-04-01' && price<=500000) return Math.max(0,(price-300000)*0.05);
    if(d<'2020-07-08' && price<=500000) return Math.max(0,(price-300000)*0.05);
  }
  if(d>='2020-07-08' && d<='2021-06-30'){const e=buyerType==='additional'?0.03:0;return bandTax([[500000,e],[925000,.05+e],[1500000,.10+e],[Infinity,.12+e]]);}
  if(d>='2021-07-01' && d<='2021-09-30'){const e=buyerType==='additional'?0.03:0;return bandTax([[250000,e],[925000,.05+e],[1500000,.10+e],[Infinity,.12+e]]);}
  if(d>='2021-10-01' && d<='2022-09-22'){const e=buyerType==='additional'?0.03:0;return bandTax([[125000,e],[250000,.02+e],[925000,.05+e],[1500000,.10+e],[Infinity,.12+e]]);}
  if(d>='2022-09-23' && d<='2024-10-30'){const e=buyerType==='additional'?0.03:0;return bandTax([[250000,e],[925000,.05+e],[1500000,.10+e],[Infinity,.12+e]]);}
  const e=buyerType==='additional'?0.05:0;return bandTax([[125000,e],[250000,.02+e],[925000,.05+e],[1500000,.10+e],[Infinity,.12+e]]);
}

function balanceForPayment(payment:number,rate:number,months:number){
  if(rate<=0)return payment*months;
  const r=rate/1200;
  return payment*(1-Math.pow(1+r,-months))/r;
}

export default function App(){
 const [data,setData]=useState<MorgData>(()=>{try{const saved=JSON.parse(localStorage.getItem("mj-v6")||"");return saved?{...DEMO,...saved,rentStages:saved.rentStages||DEMO.rentStages}:DEMO}catch{return DEMO}});
 const [sel,setSel]=useState(data.mortgages.at(-1)?.id||""); const [tab,setTab]=useState("journey"); const file=useRef<HTMLInputElement>(null);
 useEffect(()=>localStorage.setItem("mj-v6",JSON.stringify(data)),[data]);
 const m=data.mortgages.find(x=>x.id===sel)||data.mortgages.at(-1)!;
 const sim=simulate(m,true),base=simulate(m,false);
 const saved=Math.max(0,base.interest-sim.interest),short=Math.max(0,base.months-sim.months);
 const over=data.mortgages.reduce((s,x)=>s+simulate(x,true).extra,0),interestSaved=data.mortgages.reduce((s,x)=>s+Math.max(0,simulate(x,false).interest-simulate(x,true).interest),0),erc=data.mortgages.reduce((s,x)=>s+(x.erc||0),0);
 const transactionCosts=data.mortgages.reduce((s,x)=>s+(x.transaction==="purchase"?(x.stampDuty||0)+(x.fees||0):(x.fees||0)),0);
 const additionalCash=data.mortgages.reduce((s,x)=>s+(x.additionalCash||0),0);
 const today=new Date().toISOString().slice(0,10);
 const journeyByStage=useMemo(()=>data.mortgages.flatMap(x=>simulate(x,true,x.end&&x.end<today?x.end:today).points.map(p=>({...p,stageId:x.id}))).sort((a,b)=>a.date.localeCompare(b.date)),[data,today]);
 const journey=journeyByStage;
 const last=journeyByStage.at(-1); const currentValue=last?propertyValueAt(data.valuations,last.propertyId,last.date):undefined; const equity=last&&currentValue!=null?currentValue-last.balance:undefined; const ltv=last&&currentValue?last.balance/currentValue*100:undefined;
 const trackerSeries=useMemo(()=>{
   const stages=[...data.mortgages].sort((a,b)=>a.start.localeCompare(b.start));
   if(!stages.length)return [];
   let date=stages[0].start, balance=stages[0].balance, stageIndex=0, totalInterest=0;
   const out:{date:string,value:number}[]=[];
   while(date<=today && out.length<120){
     while(stageIndex<stages.length-1 && date>=stages[stageIndex+1].start){stageIndex++;balance=stages[stageIndex].balance;}
     const stage=stages[stageIndex];
     const bank=[...data.trackerData].sort((a,b)=>a.date.localeCompare(b.date)).filter(x=>x.date<=date).at(-1)?.bankRate ?? data.trackerData[0]?.bankRate ?? 0.5;
     const rate=bank+data.trackerMargin;
     const payment=paymentFor(balance,rate,Math.max(1,stage.term*12));
     const interest=balance*rate/1200;
     balance=Math.max(0,balance-(payment-interest));
     totalInterest+=interest; out.push({date,value:totalInterest}); date=addMonth(date);
   }
   return out;
 },[data,today]);
 const actualCumulative=useMemo(()=>{let total=0;return journey.map(p=>{total+=p.interest;return {date:p.date,value:total}})},[journey]);
 const trackerInterest=trackerSeries.at(-1)?.value||0;
 const actualInterestTotal=actualCumulative.at(-1)?.value||0;
 const trackerGap=trackerInterest-actualInterestTotal;
 const rentSeries=useMemo(()=>{
   const stages=[...data.rentStages].sort((a,b)=>a.start.localeCompare(b.start));
   if(!stages.length)return {points:[],total:0};
   let date=stages[0].start,stageIndex=0,total=0; const points:{date:string,value:number,rent:number,stage:string}[]=[];
   while(date<=today && points.length<140){
     while(stageIndex<stages.length-1 && date>=stages[stageIndex+1].start)stageIndex++;
     const stage=stages[stageIndex];
     if(stage.end && date>stage.end){date=addMonth(date);continue;}
     const elapsed=monthsBetween(stage.start,date)-1;
     const rent=stage.monthlyRent*Math.pow(1+stage.annualGrowth/100,elapsed/12);
     total+=rent; points.push({date,value:total,rent,stage:stage.name}); date=addMonth(date);
   }
   return {points,total};
 },[data.rentStages,today]);
 const rentTotal=rentSeries.total;
 const mortgageCashSeries=useMemo(()=>{let total=0;return journey.map(p=>{const stage=data.mortgages.find(m=>m.propertyId===p.propertyId&&m.start<=p.date&&(!m.end||p.date<=m.end)); const payment=stage?.payment||0; total+=payment; return {date:p.date,value:total};});},[journey,data.mortgages]);
 const mortgageCashTotal=mortgageCashSeries.at(-1)?.value||0;
 const rentMonthly=rentSeries.points.at(-1)?.rent||0;
 const rentVsMortgage=rentTotal-mortgageCashTotal;
 const simplifiedNetPosition=(equity||0)-rentVsMortgage;
 const defaultFixedYears=m.end&&m.start?Math.max(1,Math.round(monthsBetween(m.start,m.end)/12)):5;
 const [fixedYears,setFixedYears]=useState(defaultFixedYears);
 const fixedEnd=useMemo(()=>{const d=new Date(m.start+"T12:00:00");d.setFullYear(d.getFullYear()+fixedYears);return d.toISOString().slice(0,10)},[m.start,fixedYears]);
 const projectedFixed=useMemo(()=>simulate(m,true,fixedEnd),[m,fixedEnd]);
 const projectedBalance=projectedFixed.points.at(-1)?.balance||0;
 const remainingYears=Math.max(1,m.term-fixedYears);
 const targetPayment=m.payment;
 const rateScenarios=[4,5,6,7].map(rate=>{const maxBalance=balanceForPayment(targetPayment,rate,remainingYears*12);return {rate,maxBalance,overpay:Math.max(0,projectedBalance-maxBalance),paymentNoOverpay:paymentFor(projectedBalance,rate,remainingYears*12)}});

 const updateM=(patch:Partial<Mortgage>)=>setData(d=>({...d,mortgages:d.mortgages.map(x=>x.id===m.id?{...x,...patch}:x)}));
 const updateEvent=(id:string,patch:Partial<Event>)=>updateM({events:m.events.map(e=>e.id===id?{...e,...patch}:e)});
 const reset=()=>{setData(DEMO);setSel("m3")};
 const exportJson=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=u;a.download="mortgage-journey.json";a.click();URL.revokeObjectURL(u)};
 const importJson=(f:File)=>{const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(String(r.result));const next={...DEMO,...d,rentStages:d.rentStages||DEMO.rentStages};setData(next);setSel(next.mortgages.at(-1)?.id)}catch{alert("Invalid Mortgage Journey JSON")}};r.readAsText(f)};
 const addStage=()=>{const x:Mortgage={id:crypto.randomUUID(),name:"New mortgage stage",propertyId:"p"+crypto.randomUUID().slice(0,5),propertyName:"New property",transaction:"remortgage",start:new Date().toISOString().slice(0,10),balance:300000,rate:4,term:30,payment:1500,events:[]};setData(d=>({...d,mortgages:[...d.mortgages,x]}));setSel(x.id)};
 return <div className="app">
  <header><div><small>RETROSPECTIVE MORTGAGE CALCULATOR</small><h1>Mortgage Journey</h1><p>See what your past mortgage decisions actually achieved.</p></div><nav><button onClick={exportJson}>Export JSON</button><button className="light" onClick={()=>file.current?.click()}>Import JSON</button><input ref={file} hidden type="file" accept="application/json" onChange={e=>e.target.files?.[0]&&importJson(e.target.files[0])}/><button className="light" onClick={reset}>Reset demo</button></nav></header>
  <main>
   <section className="hero"><div><b>YOUR JOURNEY</b><h2>Turn mortgage decisions into a financial story.</h2><p>Record purchases, remortgages, overpayments, transaction costs and property values, then compare your journey with counterfactuals. The built-in demo uses deliberately rounded illustration figures.</p></div><aside><strong>Private by default</strong><span>Saved in this browser. Export JSON whenever you want a copy.</span></aside></section>
   <div className="tabs" role="tablist"><button className={tab==="journey"?"active":""} onClick={()=>setTab("journey")}>Journey</button><button className={tab==="equity"?"active":""} onClick={()=>setTab("equity")}>Equity &amp; Rent</button><button className={tab==="comparison"?"active":""} onClick={()=>setTab("comparison")}>Mortgage comparison</button><button className={tab==="future"?"active":""} onClick={()=>setTab("future")}>Future rate planner</button></div>
   <section className="metrics"><Card t="Current equity" v={equity==null?"—":money(equity)} d={ltv==null?"":`${ltv.toFixed(1)}% LTV`}/><Card t="Overpayments modelled" v={money(over)} d="Across all stages"/><Card t="Estimated interest saved" v={money(interestSaved)} d="Compared with no recorded overpayments"/><Card t="Journey costs" v={money(transactionCosts+erc)} d={`Fees + SDLT + ERCs (${money(transactionCosts)} transaction costs)`}/></section>
   <section className="panel tab-panel journey"><div className="head"><div><small>1 · MORTGAGE TIMELINE</small><h2>Build your stages</h2></div><button onClick={addStage}>+ Add mortgage</button></div><div className="timeline">{data.mortgages.map((x,i)=><button className={x.id===m.id?"stage active":"stage"} key={x.id} onClick={()=>setSel(x.id)}><b>{i+1}</b><span><strong>{x.name}</strong><small>{x.propertyName} · {x.transaction==='purchase'?'Purchase':'Remortgage'} · {dateFmt(x.start)} → {dateFmt(x.end)}</small></span><span className="right">{x.transaction==='purchase'?'Purchase':'Remortgage'}</span></button>)}</div></section>
   <section className="panel tab-panel journey"><div className="head"><div><small>2 · SELECTED MORTGAGE</small><h2>{m.name}</h2></div><button className="light" onClick={()=>{if(data.mortgages.length>1){const xs=data.mortgages.filter(x=>x.id!==m.id);setData(d=>({...d,mortgages:xs}));setSel(xs.at(-1)!.id)}}}>Delete stage</button></div>
    <div className="form"><Field l="Stage name"><input value={m.name} onChange={e=>updateM({name:e.target.value})}/></Field><Field l="Property"><input value={m.propertyName} onChange={e=>updateM({propertyName:e.target.value})}/></Field><Field l="Transaction"><select value={m.transaction} onChange={e=>updateM({transaction:e.target.value as TransactionType})}><option value="purchase">Purchase</option><option value="remortgage">Remortgage / refinance</option></select></Field><Field l="Start"><input type="date" value={m.start} onChange={e=>{const start=e.target.value;updateM(m.transaction==='purchase'&&m.purchasePrice?{start,stampDuty:stampDutyEstimate(m.purchasePrice,m.buyerType||'moving',start)}:{start})}}/></Field><Field l="End / next stage"><input type="date" value={m.end||""} onChange={e=>updateM({end:e.target.value||undefined})}/></Field><Field l="Starting mortgage"><input type="number" value={m.balance} onChange={e=>updateM({balance:+e.target.value})}/></Field><Field l="Rate %"><input type="number" step=".01" value={m.rate} onChange={e=>updateM({rate:+e.target.value})}/></Field><Field l="Original term years"><input type="number" value={m.term} onChange={e=>updateM({term:+e.target.value})}/></Field><Field l="Monthly payment"><input type="number" value={m.payment} onChange={e=>updateM({payment:+e.target.value})}/></Field><Field l="Observed end balance"><input type="number" placeholder="Optional" value={m.observed??""} onChange={e=>updateM({observed:e.target.value?+e.target.value:undefined})}/></Field>
      {m.transaction==='purchase'&&<><Field l="Purchase price"><input type="number" value={m.purchasePrice??""} onChange={e=>{const price=+e.target.value;const bt=m.buyerType||"moving";updateM({purchasePrice:price,stampDuty:stampDutyEstimate(price,bt,m.start)})}}/></Field><Field l="Buyer situation"><select value={m.buyerType||"moving"} onChange={e=>{const bt=e.target.value as BuyerType;updateM({buyerType:bt,stampDuty:stampDutyEstimate(m.purchasePrice||0,bt,m.start)})}}><option value="ftb">First-time buyer</option><option value="moving">Moving house / replacing main residence</option><option value="additional">Second/additional property</option></select></Field><Field l="Stamp Duty (auto-estimate, editable)"><input type="number" value={m.stampDuty??""} onChange={e=>updateM({stampDuty:e.target.value?+e.target.value:undefined})}/></Field><Field l="Equity from previous home"><input type="number" value={m.equityFromPrevious??""} onChange={e=>updateM({equityFromPrevious:e.target.value?+e.target.value:undefined})}/></Field><Field l="Additional cash contributed"><input type="number" value={m.additionalCash??""} onChange={e=>updateM({additionalCash:e.target.value?+e.target.value:undefined})}/></Field></>}
      <Field l="Fees (legal, broker, product etc.)"><input type="number" value={m.fees??""} onChange={e=>updateM({fees:e.target.value?+e.target.value:undefined})}/></Field><Field l="Early repayment charge"><input type="number" value={m.erc??""} onChange={e=>updateM({erc:e.target.value?+e.target.value:undefined})}/></Field>
    </div>
    {m.transaction==='purchase'&&<div className="helper"><strong>Stamp Duty:</strong> Auto-estimated from the buyer situation and purchase date, then editable if your actual tax differs. <strong>Purchase funding:</strong> {money(m.equityFromPrevious||0)} brought forward from the previous home + {money(m.additionalCash||0)} additional cash + {money(m.balance)} mortgage. Fees and Stamp Duty are tracked separately as transaction costs. These cash inputs are not treated as mortgage overpayments.</div>}
    <div className="subhead"><div><h3>Overpayment events</h3><p>Add each decision separately.</p></div><button onClick={()=>updateM({events:[...m.events,{id:crypto.randomUUID(),type:"lump",amount:10000,start:new Date().toISOString().slice(0,10),effect:"payment"}]})}>+ Add event</button></div>
    {m.events.map(e=><div className="event" key={e.id}><div className="form compact"><Field l="Type"><select value={e.type} onChange={x=>updateEvent(e.id,{type:x.target.value as EventType})}><option value="lump">Lump sum</option><option value="monthly">Monthly</option></select></Field><Field l="Amount"><input type="number" value={e.amount} onChange={x=>updateEvent(e.id,{amount:+x.target.value})}/></Field><Field l="Start"><input type="date" value={e.start} onChange={x=>updateEvent(e.id,{start:x.target.value})}/></Field>{e.type==='monthly'&&<Field l="End"><input type="date" value={e.end||e.start} onChange={x=>updateEvent(e.id,{end:x.target.value})}/></Field>}<Field l="After event"><select value={e.effect} onChange={x=>updateEvent(e.id,{effect:x.target.value as Effect})}><option value="payment">Reduce payment</option><option value="term">Keep payment / shorten term</option></select></Field></div><button className="remove" onClick={()=>updateM({events:m.events.filter(x=>x.id!==e.id)})}>Remove</button></div>)}
    <div className="metrics four"><Card t="Interest saved" v={money(saved)}/><Card t="Term shortened" v={`${short} months`}/><Card t="Overpayments" v={money(sim.extra)}/><Card t="End balance" v={money(sim.points.at(-1)?.balance||0)} d={m.observed?`Observed ${money(m.observed)}`:undefined}/></div>
    <div className="chartbox"><h3>Actual vs no-overpayment balance</h3><p>The baseline keeps the original rate/payment and removes recorded overpayments.</p><Chart series={[{name:"With your decisions",points:sim.points.map(x=>({date:x.date,value:x.balance}))},{name:"No overpayments",points:base.points.map(x=>({date:x.date,value:x.balance}))}]} xLabel="Time" yLabel="Mortgage balance"/></div>
   </section>
   <section className="panel tab-panel equity"><div className="head"><div><small>3 · PROPERTY VALUE & EQUITY</small><h2>Follow equity through every home</h2></div><button onClick={()=>setData(d=>({...d,valuations:[...d.valuations,{date:new Date().toISOString().slice(0,10),propertyId:m.propertyId,value:500000}]}))}>+ Add valuation</button></div>
    <div className="valuations">{data.valuations.map((v,i)=><div key={i}><select value={v.propertyId} onChange={e=>setData(d=>({...d,valuations:d.valuations.map((x,j)=>j===i?{...x,propertyId:e.target.value}:x)}))}>{Array.from(new Map(datumProps(data.mortgages).map(p=>[p.id,p.name])).entries()).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><input type="date" value={v.date} onChange={e=>setData(d=>({...d,valuations:d.valuations.map((x,j)=>j===i?{...x,date:e.target.value}:x)}))}/><input type="number" value={v.value} onChange={e=>setData(d=>({...d,valuations:d.valuations.map((x,j)=>j===i?{...x,value:+e.target.value}:x)}))}/><button className="remove" onClick={()=>setData(d=>({...d,valuations:d.valuations.filter((_,j)=>j!==i)}))}>Remove</button></div>)}</div>
    <div className="chartbox"><h3>Mortgage balance, property value and equity</h3><p>The chart follows the property attached to each mortgage stage, so a house move is shown as a real transition rather than treating two homes as one asset. Markers show the purchase/remortgage points, while the axes show dates and pounds.</p><Chart series={[{name:"Property value",points:journey.map(p=>({date:p.date,value:propertyValueAt(data.valuations,p.propertyId,p.date)??0}))},{name:"Mortgage balance",points:journey.map(p=>({date:p.date,value:p.balance}))},{name:"Equity",points:journey.map(p=>({date:p.date,value:(propertyValueAt(data.valuations,p.propertyId,p.date)??0)-p.balance}))}]} markers={data.mortgages.map(x=>({date:x.start,label:x.transaction==='purchase'?`Purchase: ${x.propertyName}`:`Remortgage`}))} xLabel="Journey date" yLabel="Value (£)"/></div>
   </section>
   <section className="panel tab-panel comparison"><div className="head"><div><small>4 · TRACKER COUNTERFACTUAL</small><h2>How would a tracker have compared?</h2></div><label className="inline">Tracker margin over Bank Rate <input type="number" step=".01" value={data.trackerMargin} onChange={e=>setData(d=>({...d,trackerMargin:+e.target.value}))}/>%</label></div>
    <div className="metrics metrics-inner"><Card t="Estimated interest on your fixed journey" v={money(actualInterestTotal)} d="Across all recorded stages"/><Card t="Estimated tracker interest" v={money(trackerInterest)} d={`Bank Rate + ${data.trackerMargin.toFixed(2)}%`}/><Card t="Estimated interest saved vs tracker" v={money(trackerGap)} d={trackerGap>=0?"Positive = fixed journey cost less":"Negative = tracker model cost less"}/></div><div className="benchmark"><div className="chartbox"><Chart series={[{name:"Your actual fixed-rate journey",points:actualCumulative},{name:`Illustrative tracker (Bank Rate + ${data.trackerMargin.toFixed(2)}%)`,points:trackerSeries}]} markers={data.mortgages.slice(1).map(x=>({date:x.start,label:x.transaction==='purchase'?`Purchase: ${x.propertyName}`:`Remortgage: ${x.rate.toFixed(2)}% fixed`}))} xLabel="Month" yLabel="Cumulative interest (£)"/></div><div><h3>Month-by-month model</h3><p>The comparison runs month by month from the first mortgage start date through today. Each month uses the Bank Rate in force at month-end, adds your chosen tracker margin, calculates interest on that balance and rolls it forward.</p><p>The actual line follows the fixed-rate periods you recorded. When you change mortgage stage, the tracker counterfactual resets to that stage's opening balance so the comparison stays aligned with the financing decisions you actually made.</p><p><strong>So far, this model estimates {money(trackerGap)} of interest saved by your fixed-rate journey versus the selected tracker assumption.</strong></p><p className="muted">This is an illustrative counterfactual, not a quote. A real tracker would have its own margin, fees, payment rules and lender eligibility.</p></div></div></section>
   <section className="panel tab-panel equity"><div className="head"><div><small>5 · MORTGAGE VS RENT</small><h2>What if you had rented instead?</h2></div><div className="inline"><span>ONS Aug 2026 benchmarks: Reigate &amp; Banstead semi £1,751 · Horsham detached £2,105</span></div></div>
    <p className="muted">The rent side is anchored to ONS local-authority/property-type benchmarks. ONS publishes monthly private-rent statistics by local area and property type; the historical starting figures below are editable ONS-anchored estimates rather than claims about the exact rent your homes would have achieved.</p>
    <div className="metrics metrics-inner"><Card t="Current equity" v={equity==null?"—":money(equity)} d="Your property value less mortgage"/><Card t="Cumulative ONS-benchmark rent" v={money(rentTotal)} d="What the rental alternative has cost"/><Card t="Rent minus mortgage payments" v={money(rentVsMortgage)} d={rentVsMortgage>=0?"Extra cash paid to rent":"Mortgage cash paid above rent"}/><Card t="Simplified position vs renting" v={money(simplifiedNetPosition)} d="Equity minus the rent/payment gap"/></div>
    <div className="form">{data.rentStages.map(r=><div className="card" key={r.id}><small>{r.name}</small><strong>{money(r.monthlyRent)}/mo</strong><span>ONS-anchored starting estimate · {r.annualGrowth.toFixed(1)}% p.a.</span><label>Starting benchmark<input type="number" value={r.monthlyRent} onChange={e=>setData(d=>({...d,rentStages:d.rentStages.map(x=>x.id===r.id?{...x,monthlyRent:+e.target.value}:x)}))}/></label><label>Annual benchmark growth %<input type="number" step="0.1" value={r.annualGrowth} onChange={e=>setData(d=>({...d,rentStages:d.rentStages.map(x=>x.id===r.id?{...x,annualGrowth:+e.target.value}:x)}))}/></label><span>{r.source}</span></div>)}</div>
    <div className="chartbox"><h3>Month-by-month rent vs mortgage cashflow</h3><p>This shows the monthly cash difference. The mortgage line is cash paid, not pure economic cost, because principal repayments build equity.</p><Chart series={[{name:"Cumulative ONS-benchmark rent",points:rentSeries.points.map(x=>({date:x.date,value:x.value}))},{name:"Cumulative mortgage payments",points:mortgageCashSeries}]} markers={data.mortgages.map(x=>({date:x.start,label:x.transaction==='purchase'?`Move: ${x.propertyName}`:`Remortgage`}))} xLabel="Month" yLabel="Cumulative cash paid (£)"/></div>
    <div className="helper"><strong>The headline comparison:</strong> today you have an asset worth your current equity. The rental alternative has no property equity; it has cumulative rent paid instead. The simplified position above then adjusts your current equity by the difference between cumulative rent and cumulative mortgage payments. This is a deliberately simple retrospective measure — it does not include deposit opportunity cost, maintenance, insurance, investment returns or the tax treatment of renting/owning.</div>
   </section>
   <section className="panel tab-panel journey"><div className="head"><div><small>6 · LIFETIME COSTS</small><h2>What have you paid along the way?</h2></div></div><div className="costgrid"><Card t="Stamp Duty" v={money(data.mortgages.reduce((s,x)=>s+(x.stampDuty||0),0))} d="Purchase stages only"/><Card t="Fees" v={money(data.mortgages.reduce((s,x)=>s+(x.fees||0),0))} d="Legal, broker, product etc."/><Card t="Additional cash contributed" v={money(additionalCash)} d="Capital added at purchases"/><Card t="Early repayment charges" v={money(erc)} d="Entered by you"/></div><div className="helper"><strong>Lifetime transaction costs:</strong> {money(transactionCosts+erc)}. This excludes the cash you put into the property because that becomes equity rather than a cost.</div></section>
   <section className="panel tab-panel future"><div className="head"><div><small>7 · FUTURE RATE PLANNER</small><h2>What could my payment be when the fix ends?</h2></div></div>
    <p className="muted">Project the balance at the end of the fixed period, then test a higher future rate. The planner calculates the lump sum you would need to pay at the end of the fix to keep your chosen monthly payment unchanged.</p>
    <div className="form"><Field l="Selected mortgage"><select value={m.id} onChange={e=>setSel(e.target.value)}>{data.mortgages.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field l="Fixed period (years)"><input type="number" min="1" max="10" value={fixedYears} onChange={e=>setFixedYears(Math.max(1,+e.target.value||1))}/></Field><Field l="Current monthly payment"><input type="number" value={m.payment} onChange={e=>updateM({payment:+e.target.value})}/></Field><Field l="Remaining term after fix (years)"><input type="number" value={remainingYears} readOnly/></Field></div>
    <div className="metrics metrics-inner"><Card t="Projected balance at fix end" v={money(projectedBalance)} d={dateFmt(fixedEnd)}/><Card t="Payment to preserve" v={money(targetPayment)} d="Your chosen monthly payment target"/><Card t="Remaining term" v={`${remainingYears} years`} d="Illustrative assumption"/></div>
    <div className="costgrid">{rateScenarios.map(x=><div className="card" key={x.rate}><small>If the new rate is {x.rate}%</small><strong>{money(x.overpay)}</strong><span>Approx. lump sum needed at fix end to keep payments at {money(targetPayment)}/month</span><span>Without the lump sum: {money(x.paymentNoOverpay)}/month</span></div>)}</div>
    <div className="helper"><strong>How to use it:</strong> if you think rates could be 6% when your fix ends, look at the 6% scenario. It does not predict rates; it tells you how much of the projected balance would need to be removed to keep your payment at the level you choose. Your lender's actual remortgage rate, term, fees and affordability assessment will determine the real payment.</div>
   </section>
   <section className="notice"><b>Assumptions:</b> Rent figures are editable ONS-anchored estimates. ONS local-authority/property-type averages are benchmarks, not property-specific valuations; historical starting figures are back-cast estimates until the app embeds the full monthly PIPR series.  monthly interest; lump sums reduce balance in the event month; “reduce payment” recalculates over the remaining original term; recurring plans apply during their date range. Stamp Duty is an estimate/entry field and depends on the buyer's circumstances and rules at the time. Tracker comparison uses monthly Bank Rate observations plus an editable margin. Actual lender rules vary. Educational software, not financial advice.</section>
  </main>
 </div>
}
function datumProps(ms:Mortgage[]){return ms.map(m=>({id:m.propertyId,name:m.propertyName}))}
function Card({t,v,d}:{t:string,v:string,d?:string}){return <div className="card"><small>{t}</small><strong>{v}</strong>{d&&<span>{d}</span>}</div>}
function Field({l,children}:{l:string;children:ReactNode}){return <label>{l}{children}</label>}
