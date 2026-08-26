/**
 * Les FICHES (les connecteurs mâles) qui terminent les câbles des
 * périphériques : USB-A, HDMI, RJ45, jack 3,5 mm, prise secteur C13.
 *
 * Convention d'orientation, la même pour toutes :
 *   - la POINTE (ce qui entre dans la prise) est à l'origine, tournée vers -Z
 *   - le corps de la fiche s'étend vers +Z
 *   - le câble repart depuis l'arrière, en +Z
 *
 * Les prises de l'unité centrale sont toutes tournées vers l'arrière (+Z) :
 * poser une fiche à la position d'une prise suffit donc à l'y enfoncer,
 * sans aucune rotation.
 */

export type PlugKind = 'usb-a' | 'hdmi' | 'displayport' | 'rj45' | 'jack' | 'c13'

export interface PlugSpec {
  /** Longueur totale de la fiche (utile pour raccrocher le câble) */
  length: number
  label: string
}

export const PLUGS: Record<PlugKind, PlugSpec> = {
  'usb-a': { length: 3.4, label: 'Fiche USB-A' },
  hdmi: { length: 3.8, label: 'Fiche HDMI' },
  displayport: { length: 3.8, label: 'Fiche DisplayPort' },
  rj45: { length: 3.6, label: 'Fiche RJ45' },
  jack: { length: 3.2, label: 'Fiche jack 3,5 mm' },
  c13: { length: 4.2, label: 'Fiche secteur C13' },
}

/* ---------------------------------------------------------------- */
/*  USB-A : coque métallique rectangulaire + languette blanche        */
/* ---------------------------------------------------------------- */

function UsbAPlug() {
  return (
    <group>
      {/* Coque métallique (12 x 4,5 mm) */}
      <mesh position={[0, 0, 0.6]} castShadow>
        <boxGeometry args={[1.2, 0.45, 1.2]} />
        <meshStandardMaterial color="#b9c0c9" metalness={1} roughness={0.32} />
      </mesh>
      {/* Languette intérieure : c'est elle qui donne le sens de branchement */}
      <mesh position={[0, -0.09, 0.55]}>
        <boxGeometry args={[0.94, 0.16, 1.1]} />
        <meshStandardMaterial color="#e9edf3" roughness={0.55} />
      </mesh>
      {/* Corps plastique */}
      <mesh position={[0, 0, 2.15]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 1.15, 2.0]} />
        <meshStandardMaterial color="#14171d" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Nervures antidérapantes */}
      {[-0.5, 0, 0.5].map((z) => (
        <mesh key={z} position={[0, 0.6, 2.15 + z]}>
          <boxGeometry args={[1.72, 0.06, 0.18]} />
          <meshStandardMaterial color="#0a0c10" roughness={0.8} />
        </mesh>
      ))}
      {/* Le fameux trident USB, gravé sur le dessus */}
      <mesh position={[0, 0.62, 2.15]}>
        <boxGeometry args={[0.1, 0.03, 1.1]} />
        <meshStandardMaterial color="#93a0b4" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  HDMI / DisplayPort : coque plate et large                         */
/* ---------------------------------------------------------------- */

function VideoPlug({ dp = false }: { dp?: boolean }) {
  const w = dp ? 1.5 : 1.5
  return (
    <group>
      {/* Coque métallique (la vraie est légèrement trapézoïdale) */}
      <mesh position={[0, 0, 0.55]} castShadow>
        <boxGeometry args={[w, 0.5, 1.1]} />
        <meshStandardMaterial color="#c2c8d1" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 1.06]}>
        <boxGeometry args={[w - 0.24, 0.28, 0.1]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.9} />
      </mesh>
      {/* Corps plastique */}
      <mesh position={[0, 0, 2.4]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 1.15, 2.6]} />
        <meshStandardMaterial color={dp ? '#1a1d24' : '#16191f'} roughness={0.42} />
      </mesh>
      {/* Sur le DisplayPort : le petit ergot de verrouillage */}
      {dp && (
        <mesh position={[0, -0.32, 1.35]}>
          <boxGeometry args={[0.5, 0.18, 0.4]} />
          <meshStandardMaterial color="#c2c8d1" metalness={0.9} roughness={0.35} />
        </mesh>
      )}
      <mesh position={[0, 0.62, 2.4]}>
        <boxGeometry args={[1.2, 0.04, 0.5]} />
        <meshStandardMaterial color="#8d97a6" metalness={0.7} roughness={0.45} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  RJ45 : fiche transparente avec son clip                           */
/* ---------------------------------------------------------------- */

function Rj45Plug() {
  return (
    <group>
      {/* Corps translucide */}
      <mesh position={[0, 0, 1.1]} castShadow>
        <boxGeometry args={[1.15, 1.1, 2.2]} />
        <meshStandardMaterial color="#cfd8c8" transparent opacity={0.72} roughness={0.25} metalness={0.05} />
      </mesh>
      {/* Les 8 contacts dorés, visibles à travers le plastique */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-0.42 + i * 0.12, 0.42, 0.7]}>
          <boxGeometry args={[0.07, 0.06, 0.9]} />
          <meshStandardMaterial color="#d9ad4a" metalness={1} roughness={0.25} />
        </mesh>
      ))}
      {/* Le clip : c'est lui qui fait CLIC et qui casse si on tire dessus */}
      <mesh position={[0, -0.62, 1.5]} rotation={[0.24, 0, 0]}>
        <boxGeometry args={[0.5, 0.12, 1.5]} />
        <meshStandardMaterial color="#cfd8c8" transparent opacity={0.8} roughness={0.3} />
      </mesh>
      {/* Manchon du câble */}
      <mesh position={[0, 0, 2.9]} castShadow>
        <boxGeometry args={[1.35, 1.3, 1.4]} />
        <meshStandardMaterial color="#1d5fa8" roughness={0.6} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Jack 3,5 mm : le petit cylindre à anneaux                         */
/* ---------------------------------------------------------------- */

function JackPlug({ color = '#7bd17b' }: { color?: string }) {
  return (
    <group>
      {/* Broche métallique */}
      <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.175, 0.175, 1.4, 16]} />
        <meshStandardMaterial color="#d5dae2" metalness={1} roughness={0.22} />
      </mesh>
      {/* Anneaux isolants noirs : ils séparent gauche, droite et masse */}
      {[0.35, 0.75].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.09, 16]} />
          <meshStandardMaterial color="#0a0b0e" roughness={0.9} />
        </mesh>
      ))}
      {/* Manchon coloré (vert = son qui sort, rose = son qui entre) */}
      <mesh position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.36, 1.6, 18]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0, 3.0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.24, 0.7, 14]} />
        <meshStandardMaterial color="#15181d" roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- */
/*  Prise secteur C13 : la grosse fiche noire du câble d'alimentation  */
/* ---------------------------------------------------------------- */

function C13Plug() {
  return (
    <group>
      {/* Corps : un rectangle dont deux angles sont coupés (détrompeur) */}
      <mesh position={[0, 0, 1.0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 1.9, 2.0]} />
        <meshStandardMaterial color="#101317" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.62, 1.0]} castShadow>
        <boxGeometry args={[2.0, 0.7, 2.0]} />
        <meshStandardMaterial color="#101317" roughness={0.55} />
      </mesh>
      {/* Les trois alvéoles : phase, neutre, terre */}
      {[-0.7, 0, 0.7].map((x, i) => (
        <mesh key={x} position={[x, i === 1 ? 0.45 : -0.25, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.12, 12]} />
          <meshStandardMaterial color="#05060a" roughness={0.95} />
        </mesh>
      ))}
      {/* Manchon du câble */}
      <mesh position={[0, 0, 2.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.85, 0.62, 1.4, 16]} />
        <meshStandardMaterial color="#0d0f13" roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- */

export function Plug({ kind, color }: { kind: PlugKind; color?: string }) {
  switch (kind) {
    case 'usb-a':
      return <UsbAPlug />
    case 'hdmi':
      return <VideoPlug />
    case 'displayport':
      return <VideoPlug dp />
    case 'rj45':
      return <Rj45Plug />
    case 'jack':
      return <JackPlug color={color} />
    case 'c13':
      return <C13Plug />
  }
}
