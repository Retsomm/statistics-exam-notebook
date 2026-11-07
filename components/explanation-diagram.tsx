import type {ExplanationDiagram as Diagram} from '@/lib/types';

export default function ExplanationDiagram({diagram}:{diagram:Diagram}){
 const nodes=new Map(diagram.nodes.map(node=>[node.id,node]));
 return <figure className="explanation-diagram" aria-label={diagram.title}>
  <figcaption>{diagram.title}</figcaption>
  <svg viewBox="0 0 600 310" role="img" aria-label={diagram.description}>
   <title>{diagram.description}</title>
   {diagram.edges.map(([from,to])=>{const start=nodes.get(from),end=nodes.get(to);return start&&end?<line key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y}/>:null;})}
   {diagram.nodes.map(node=><g key={node.id} transform={`translate(${node.x} ${node.y})`}>
    <circle className="tree-node" r="30"/>
    <text className="tree-label" textAnchor="middle" dominantBaseline="central">{node.label}</text>
    {node.step&&<><circle className="tree-step" cx="25" cy="-25" r="14"/><text className="tree-step-label" x="25" y="-25" textAnchor="middle" dominantBaseline="central">{node.step}</text></>}
   </g>)}
  </svg>
  {diagram.kind==='graph-traversal'?<><p><strong>DFS（深度優先）：</strong>{diagram.sequence.join('，')}</p><p><strong>BFS（廣度優先）：</strong>{diagram.breadthSequence?.join('，')}</p><p className="text-muted">本圖為教學示意；從 A 開始，未訪問鄰點依字母順序選擇。</p></>:<p><strong>前序走訪順序：</strong>{diagram.sequence.join('，')}</p>}
 </figure>;
}
