'use client';
import {useEffect,useId,useRef,type ReactNode,type RefObject} from 'react';

type Props={title:ReactNode;subtitle:ReactNode;closeLabel:string;onClose:()=>void;children:ReactNode;footer:ReactNode;className?:string;closeOnBackdrop?:boolean;returnFocusRef?:RefObject<HTMLElement|null>};
// Feature dialogs supply content; focus, Escape, scrolling and layout have one owner.
export default function ModalDialog({title,subtitle,closeLabel,onClose,children,footer,className='',closeOnBackdrop=false,returnFocusRef}:Props){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId();
 useEffect(()=>{
  const dialog=ref.current,overflow=document.body.style.overflow,returnFocus=returnFocusRef?.current;
  dialog?.showModal();document.body.style.overflow='hidden';
  return()=>{
   dialog?.close();
   document.body.style.overflow=overflow;
   if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
  };
 },[returnFocusRef]);
 return <dialog ref={ref} className={`explanation-dialog ${className}`.trim()} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(closeOnBackdrop&&e.target===e.currentTarget)onClose();}}>
  <header className="explanation-dialog-header"><div><h2 id={titleId}>{title}</h2><p>{subtitle}</p></div><button type="button" className="btn" onClick={onClose} autoFocus aria-label={closeLabel}>關閉 ×</button></header>
  <div className="explanation-dialog-content">{children}</div>
  <footer className="explanation-dialog-footer">{footer}</footer>
 </dialog>;
}
