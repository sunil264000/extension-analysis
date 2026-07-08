// Generates a fresh ECDSA P-256 keypair for license-token signing.
//
//   node scripts/gen-signing-key.mjs
//
// Then:
//   1. Set the env var LICENSE_SIGNING_KEY to the printed PRIVATE_JWK.
//   2. Put the printed PUBLIC_SPKI_B64 into extension-fixed/license-core.js
//      (the LI_PUBKEY_SPKI constant).
import { generateKeyPairSync } from 'crypto'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const privJwk = privateKey.export({ format: 'jwk' })
const spki = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')

console.log('LICENSE_SIGNING_KEY (env, private JWK):')
console.log(JSON.stringify(privJwk))
console.log('')
console.log('PUBLIC_SPKI_B64 (embed in extension license-core.js):')
console.log(spki)
