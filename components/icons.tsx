const shapes: Record<string,string> = {
  home:'M3 10 12 3l9 7v10h-6v-7H9v7H3Z',
  library:'M3 4h4v16H3Zm6 0h4v16H9Zm6 1 4-1 3 15-4 1ZM3 8h4m2 0h4m-10 9h4m2 0h4',
  stopwatch:'M10 2h4m-2 0v3m6 1 2-2M12 9v4l3 2M20 13a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  notebook:'M5 3h14v18H5Zm-2 4h4m-4 5h4m-4 5h4m3-10h6m-6 4h6m-6 4h4',
  archive:'M3 3h18v4H3Zm2 4v14h14V7m-10 5h6',
  user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
  calendar:'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2m2-2v5m10-5v5M3 10h18m-14 4h2m4 0h2m-8 3h2',
  target:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0m-5 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0m-5 0h.01',
  chart:'M4 20V10m6 10V4m6 16v-7m6 7V7M3 20h18',
  star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
  wrong:'M5 3h12l3 3v15H5Zm4 6h6m-6 4h6m-6 4h3',
  clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  settings:'M4 7h16M4 17h16M8 4v6m8 4v6',
  check:'m5 12 4 4L19 6', close:'m6 6 12 12M6 18 18 6',
  arrow:'M4 12h16m-6-6 6 6-6 6',back:'M20 12H4m6-6-6 6 6 6',
};
const Icon = ({name}:{name:string}) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={shapes[name]||shapes.chart}/></svg>;
export default Icon;
