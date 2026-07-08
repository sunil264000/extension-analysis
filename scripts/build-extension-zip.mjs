import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

const SRC = path.resolve('extension-fixed')
const OUT = path.resolve('public/lovable-infinity-patched.zip')
const EXCLUDE = new Set(['README_EXTENSION.md', 'LICENSE_VALIDATOR_SETUP.md', '.DS_Store'])

const zip = new JSZip()
function add(dir, base = '') {
  for (const name of fs.readdirSync(dir)) {
    if (EXCLUDE.has(name)) continue
    const full = path.join(dir, name)
    const rel = base ? `${base}/${name}` : name
    const st = fs.statSync(full)
    if (st.isDirectory()) add(full, rel)
    else zip.file(rel, fs.readFileSync(full))
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
console.log('Files:', Object.keys(zip.files).length)
