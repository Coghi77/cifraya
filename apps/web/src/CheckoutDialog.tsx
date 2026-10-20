import {useEffect, useRef, type ReactNode} from 'react';

export default function CheckoutDialog({children,onClose}:{children:ReactNode;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const element=dialog.current!;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    element.showModal();
    return ()=>{element.close();document.body.style.overflow=previous;};
  },[]);
  return <dialog ref={dialog} className="checkout-dialog" aria-labelledby="modal-title" onClose={onClose} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}>{children}</dialog>;
}
