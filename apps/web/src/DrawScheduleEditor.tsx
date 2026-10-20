import BrandSelect from './BrandSelect';
export type DrawMode='DATE'|'SOLD_OUT'|'ANNOUNCED';
// Date inputs always represent Costa Rica (UTC-6), regardless of the admin device timezone.
export const toDrawDate=(value:string)=>value ? new Date(value+':00-06:00').toISOString() : null;
export const fromDrawDate=(value:string|null|undefined)=>value ? new Date(new Date(value).getTime()-6*3600000).toISOString().slice(0,16) : '';
export default function DrawScheduleEditor({mode,date,onChange}:{mode:string;date:string;onChange:(mode:DrawMode,date:string)=>void}) {
 return <fieldset className="draw-schedule-editor"><legend>Fecha del sorteo</legend><BrandSelect label="Modalidad del sorteo" value={mode} onChange={value=>onChange(value as DrawMode,date)} options={[{value:'ANNOUNCED',label:'Fecha por anunciar'},{value:'DATE',label:'Fecha del sorteo'},{value:'SOLD_OUT',label:'Hasta agotar números'}]}/>{mode==='DATE'&&<label>Fecha y hora (Costa Rica)<input type="datetime-local" required value={date} onChange={event=>onChange('DATE',event.target.value)}/></label>}<small>El contador es informativo: no cierra ventas ni modifica las reservas.</small></fieldset>;
}
