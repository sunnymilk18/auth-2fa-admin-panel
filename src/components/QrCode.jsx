import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Dibuja `value` como código QR. Se genera en el navegador: el contenido (p. ej.
// la URL otpauth de una cuenta nueva, que lleva el secreto TOTP) no sale a
// ningún servicio externo.
export function QrCode({ value, alt }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: 184, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setSrc(''));
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) return <div className="new-account-qr" role="img" aria-label={alt} />;
  return <img className="new-account-qr" src={src} alt={alt} width="184" height="184" />;
}
