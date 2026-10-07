import { useEffect, useState } from 'react';

const LOCK_FROM = 750; // ms hasta que se fija el primer dígito del móvil
const LOCK_STEP = 190; // ms entre un dígito y el siguiente
const BURST = 14; // partículas del cierre
const DOTS = 8; // caracteres de la contraseña que se "escribe"

const randomDigit = () => String(Math.floor(Math.random() * 10));
const randomCode = () => Array.from({ length: 6 }, randomDigit);

function Check() {
  return (
    <svg className="lock-check" width="22" height="22" viewBox="0 0 22 22">
      <path d="M5 11.5 9.5 16 17 6.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Escena de bienvenida: un candado abierto, la persona (algo que sabe: la
// contraseña) a un lado y el móvil (algo que tiene: el código TOTP) al otro.
// Cada factor se completa, ambos se acercan al candado, este se cierra con un
// destello y los dos quedan girando despacio a su alrededor.
// Es decorativa: los dígitos no son un código real y todo está oculto para los
// lectores de pantalla. Con `play` hace toda la entrada; sin `play` aparece ya
// en su estado final (candado cerrado y los dos íconos en órbita).
export function WelcomeLock({ play }) {
  const [code] = useState(randomCode);
  const [locked, setLocked] = useState(0);
  const [spinning, setSpinning] = useState(randomCode);

  useEffect(() => {
    if (!play) return undefined;
    const start = performance.now();
    const id = setInterval(() => {
      const elapsed = performance.now() - start;
      const done = Math.max(0, Math.min(6, Math.floor((elapsed - LOCK_FROM) / LOCK_STEP) + 1));
      setLocked(done);
      setSpinning(randomCode());
      if (done >= 6) clearInterval(id);
    }, 70);
    return () => clearInterval(id);
  }, [play]);

  const digits = code.map((digit, i) => (i < locked ? digit : spinning[i]));

  return (
    <div className="lockstage-wrap" aria-hidden="true">
      <div className="lockstage">
        <div className="lock-glow" />

        <svg className="lock" viewBox="0 0 240 240">
          <g className="lock-shackle">
            <path d="M96 112V86a24 24 0 0 1 48 0v26" />
          </g>
          <rect className="lock-body" x="68" y="112" width="104" height="86" rx="14" />
          <circle className="lock-keyhole" cx="120" cy="150" r="7" />
          <path className="lock-keyhole" d="M120 156v18" />
        </svg>

        <div className="lock-burst">
          {Array.from({ length: BURST }, (_, i) => (
            <span
              key={i}
              className="lock-spark"
              style={{ '--a': `${(i / BURST) * 360 + (i % 2 ? 8 : -6)}deg`, '--dist': `${70 + (i % 3) * 22}px` }}
            />
          ))}
        </div>

        <div className="orbit">
          {/* La persona: ícono y, debajo, la contraseña que se escribe. */}
          <div className="orbit-item orbit-item--user">
            <div className="orbit-upright">
              <div className="glyph">
                <svg className="glyph-icon" width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="21" r="11" />
                  <path d="M10 56c0-13 10-20 22-20s22 7 22 20" />
                </svg>
                {play && (
                  <div className="glyph-detail">
                    <div className="user-dots">
                      {Array.from({ length: DOTS }, (_, i) => (
                        <span key={i} style={{ '--i': i }} />
                      ))}
                    </div>
                    <Check />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* El móvil: ícono y, en su pantalla, el código que se fija. */}
          <div className="orbit-item orbit-item--phone">
            <div className="orbit-upright">
              <div className="glyph">
                <svg className="glyph-icon" width="64" height="112" viewBox="0 0 64 112">
                  <rect x="2" y="2" width="60" height="108" rx="12" />
                  <path d="M25 11h14" />
                </svg>
                {play && (
                  <div className="glyph-detail">
                    <div className="phone-code mono">
                      {digits.map((d, i) => (
                        <span key={i} className={i < locked ? 'is-locked' : undefined}>
                          {d}
                        </span>
                      ))}
                    </div>
                    <Check />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
