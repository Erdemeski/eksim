/**
 * Küçük PNG → ICO sarmalayıcı (ImageMagick olmadan).
 *
 * ICO formatı 256×256 bir kareyi doğrudan PNG olarak gömmeye izin verir (Vista+).
 * Tek girişli bir ICO üretir: 6 baytlık başlık + 16 baytlık dizin girişi + PNG.
 * electron-builder Windows hedefi için gerçek bir .ico ister; bu script build
 * adımında `build/icon-256.png` → `build/icon.ico` üretir.
 *
 * Kullanım: node scripts/png-to-ico.mjs [girisPng] [cikisIco]
 */
import { readFileSync, writeFileSync } from 'node:fs'

const input = process.argv[2] ?? 'build/icon-256.png'
const output = process.argv[3] ?? 'build/icon.ico'

const png = readFileSync(input)

// PNG imzası + IHDR'den boyutu doğrula (256 → ICO dir'de 0 olarak kodlanır).
const width = png.readUInt32BE(16)
const height = png.readUInt32BE(20)
const dim = (n) => (n >= 256 ? 0 : n) // 0 == 256 (ICO kuralı)

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: 1 = icon
header.writeUInt16LE(1, 4) // görüntü sayısı

const entry = Buffer.alloc(16)
entry.writeUInt8(dim(width), 0)
entry.writeUInt8(dim(height), 1)
entry.writeUInt8(0, 2) // palet renk sayısı
entry.writeUInt8(0, 3) // reserved
entry.writeUInt16LE(1, 4) // color planes
entry.writeUInt16LE(32, 6) // bit derinliği
entry.writeUInt32LE(png.length, 8) // bu görüntünün bayt boyutu
entry.writeUInt32LE(6 + 16, 12) // PNG verisinin ofseti (başlık + giriş)

writeFileSync(output, Buffer.concat([header, entry, png]))
// eslint-disable-next-line no-console
console.log(`ICO yazıldı: ${output} (${width}x${height}, ${png.length} bayt PNG)`)
