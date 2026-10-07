// El secreto TOTP viene dentro de la URL otpauth, para quien prefiera
// escribirlo a mano en vez de escanear el QR.
export function secretFrom(otpauthURL) {
  try {
    return new URL(otpauthURL).searchParams.get('secret') || '';
  } catch {
    return '';
  }
}
