import { Facebook, Instagram, MessageCircle, Phone } from 'lucide-react';

function externalLink(value: string | undefined) {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; }
  catch { return undefined; }
}

const links = [
  { name: 'WhatsApp', href: externalLink(import.meta.env.VITE_CIFRAYA_WHATSAPP_URL), icon: <span className="footer-whatsapp-mark"><MessageCircle aria-hidden="true"/><Phone aria-hidden="true"/></span> },
  { name: 'Facebook', href: externalLink(import.meta.env.VITE_CIFRAYA_FACEBOOK_URL), icon: <Facebook aria-hidden="true"/> },
  { name: 'Instagram', href: externalLink(import.meta.env.VITE_CIFRAYA_INSTAGRAM_URL), icon: <Instagram aria-hidden="true"/> },
];

export default function FooterSocials() {
  return <ul className="footer-socials" aria-label="Redes sociales de Cifraya">
    {links.map(({ name, href, icon }) => <li className="footer-social-item" key={name}>
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${name} de Cifraya`}>
        <span className="footer-social-fill" aria-hidden="true"/>{icon}
      </a> : <span className="footer-social-disabled" tabIndex={0} aria-label={`${name} aún no disponible`} role="img">{icon}</span>}
      <span className="footer-social-tooltip" role="tooltip">{href ? name : `${name} próximamente`}</span>
    </li>)}
  </ul>;
}
