import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'
import JavaScriptObfuscator from 'javascript-obfuscator'

const SRC = path.resolve('extension-fixed')
const OUT = path.resolve('public/unlimited-lovable.zip')
// Everything is nested under this folder so extracting the zip yields a single
// cleanly-named folder the user can load straight into Chrome.
const ROOT_FOLDER = 'Unlimited Lovable'
const EXCLUDE = new Set(['README_EXTENSION.md', 'LICENSE_VALIDATOR_SETUP.md', '.DS_Store'])

// Only our own security-critical scripts get obfuscated. The pre-existing
// vendor bundles are already minified and re-obfuscating them risks breakage.
const OBFUSCATE = new Set([
  'license-core.js',
  'local-activation.js',
  'prompt-tracker.js',
  'automation-runtime.js',
])

// Obfuscator options tuned to stay functional inside a Chrome extension:
// - self-defending + debug protection make step-through debugging painful
// - string array + rc4 encoding hides the API base / storage keys
// - control-flow + dead-code flattening makes patching logic hard
// We keep `renameGlobals:false` so the `LICORE` global stays exposed, and
// disable `unicodeEscapeSequence` to keep the bundle size sane.
const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 3,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.8,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
}

const zip = new JSZip()
let obfuscatedCount = 0

function add(dir, base = '') {
  for (const name of fs.readdirSync(dir)) {
    if (EXCLUDE.has(name)) continue
    const full = path.join(dir, name)
    // `rel` is the path relative to SRC (used for OBFUSCATE matching);
    // `zipPath` is where it lands inside the archive (under ROOT_FOLDER).
    const rel = base ? `${base}/${name}` : name
    const zipPath = `${ROOT_FOLDER}/${rel}`
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      add(full, rel)
    } else if (OBFUSCATE.has(rel)) {
      const source = fs.readFileSync(full, 'utf8')
      const result = JavaScriptObfuscator.obfuscate(source, OBFUSCATOR_OPTIONS)
      const banner = '/* Unlimited Lovable - (c) 2026 Sunil Kumar - All Rights Reserved - protected build */\n'
      zip.file(zipPath, banner + result.getObfuscatedCode())
      obfuscatedCount++
      console.log('  obfuscated', rel)
    } else {
      zip.file(zipPath, fs.readFileSync(full))
    }
  }
}

add(SRC)

const buf = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
})
fs.writeFileSync(OUT, buf)
console.log('Wrote', OUT, (buf.length / 1024).toFixed(0) + ' KB')
console.log('Files:', Object.keys(zip.files).length, '| Obfuscated:', obfuscatedCount)
