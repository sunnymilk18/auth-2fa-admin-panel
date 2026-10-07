// Misma regla que el backend (net.ParseIP): IPv4 con octetos 0-255, o IPv6.
export function isValidIP(value) {
  if (/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(value)) {
    return value.split('.').every((octet) => Number(octet) <= 255);
  }
  if (!value.includes(':')) return false;
  try {
    new URL(`http://[${value}]`);
    return true;
  } catch {
    return false;
  }
}
