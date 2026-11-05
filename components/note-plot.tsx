'use client';
export type NotePlotData={title:string;description:string;xLabel:string;yLabel:string;xMin:number;xMax:number;yMin:number;yMax:number;series:{name:string;kind:string;points:{x:number;y:number}[]}[]};
export default function NotePlot({plot}:{plot:NotePlotData}){
 const x=(value:number)=>65+(value-plot.xMin)/(plot.xMax-plot.xMin)*495;
 const y=(value:number)=>270-(value-plot.yMin)/(plot.yMax-plot.yMin)*235;
 const ticks=[0,0.25,0.5,0.75,1];
 return <figure className="note-plot"><figcaption>{plot.title}</figcaption><div className="note-plot-scroll" role="region" aria-label={`${plot.title}圖形，可橫向捲動`} tabIndex={0}><svg viewBox="0 0 600 335" role="img" aria-label={plot.description}>
 <line x1="65" y1="270" x2="560" y2="270"/><line x1="65" y1="35" x2="65" y2="270"/>
 {ticks.map(t=>{const xv=plot.xMin+t*(plot.xMax-plot.xMin),yv=plot.yMin+t*(plot.yMax-plot.yMin);return <g key={t}><text x={x(xv)} y="294" textAnchor="middle">{Number(xv.toFixed(2))}</text><text x="55" y={y(yv)} textAnchor="end" dominantBaseline="central">{Number(yv.toFixed(2))}</text></g>;})}
 <text x="310" y="325" textAnchor="middle">{plot.xLabel}</text><text x="65" y="20">{plot.yLabel}</text>
 {plot.series.map((series,index)=><g key={series.name} className={`note-plot-series series-${index}`}>
 {series.kind==='line'&&<polyline points={series.points.map(p=>`${x(p.x)},${y(p.y)}`).join(' ')}/>}
 {series.points.map((p,i)=>series.kind==='bar'?<rect key={i} x={x(p.x)-13} y={y(p.y)} width="26" height={Math.max(0,y(0)-y(p.y))}><title>{`${series.name}：${p.x}，${p.y}`}</title></rect>:series.kind==='scatter'?<circle key={i} cx={x(p.x)} cy={y(p.y)} r="5"><title>{`${series.name}：${p.x}，${p.y}`}</title></circle>:null)}
 </g>)}
 </svg></div><p>{plot.description}</p><p className="note-plot-legend">{plot.series.map((series,i)=><span className={`series-${i}`} key={series.name}>{series.name}（{series.kind==='bar'?'長條':series.kind==='scatter'?'圓點':'實線'}）</span>)}</p></figure>;
}
