import {CheckCircle2,X} from 'lucide-react';
import './confirmation.css';

// Adapted from akshat-patel28/quick-baboon-29 (MIT); see THIRD_PARTY_NOTICES.md.
export default function Confirmation({message,onClose}:{message:string;onClose:()=>void}){
 return <div className="vn-confirmation" role="status"><svg className="vn-confirmation-wave" viewBox="0 0 1440 320" aria-hidden="true"><path d="M0,256L80,192C160,128,240,256,320,192C400,128,480,288,560,224C640,160,720,256,800,128C880,0,960,256,1040,192C1120,128,1200,256,1280,192L1440,64V320H0Z"/></svg><span className="vn-confirmation-icon"><CheckCircle2 size={18}/></span><div><strong>Listo</strong><p>{message}</p></div><button type="button" onClick={onClose} aria-label="Cerrar confirmación"><X size={18}/></button></div>;
}
