// Debug StrongIV round-trip
const CryptoJS = require('crypto-js');
const { Base64 } = require('js-base64');
const pako = require('pako');
const fs = require('fs');

const mapSrc = fs.readFileSync('src/lib/ChineseMapData.ts', 'utf-8');
const json = mapSrc.replace('export const CHINESE_MAP: any = ', '').replace(/;\s*$/, '');
const MAP = JSON.parse(json);
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMSYM = '0123456789+/=';
const types = ['N', 'V', 'A', 'AD'];
const ReverseMaps = {};
let PayloadLetter = '';
for (const t of types) {
  ReverseMaps[t] = {};
  for (const l of LETTERS) { const m = MAP.Actual[t].alphabet[l]; if (m) { ReverseMaps[t][m] = l; if (!PayloadLetter.includes(m)) PayloadLetter += m; } }
  for (const n of NUMSYM) { const m = MAP.Actual[t].numbersymbol[n]; if (m) { ReverseMaps[t][m] = n; if (!PayloadLetter.includes(m)) PayloadLetter += m; } }
}
function getCryptText(ch, type) {
  if (LETTERS.includes(ch)) return MAP.Actual[type].alphabet[ch] || null;
  if (NUMSYM.includes(ch)) return MAP.Actual[type].numbersymbol[ch] || null;
  return null;
}
function enMap(str) {
  let result = '';
  for (let i = 0; i < str.length; i++) { const type = types[i % 4]; const mapped = getCryptText(str[i], type); if (mapped) result += mapped; }
  return result;
}
function deMap(str) {
  let filtered = '';
  for (let i = 0; i < str.length; i++) { if (PayloadLetter.includes(str[i])) filtered += str[i]; }
  let result = '';
  for (let i = 0; i < filtered.length; i++) { const type = types[i % 4]; const origin = ReverseMaps[type][filtered[i]]; if (origin) result += origin; }
  return result;
}
function wordToUint8(data) { const arr = new Uint8Array(data.sigBytes); for (let i = 0; i < data.sigBytes; i++) arr[i] = (data.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff; return arr; }
function removePadding(b64) { return b64.replace(/=+$/, ''); }
function addPadding(str) { const mod = str.length % 4; if (mod === 3) return str + '='; if (mod === 2) return str + '=='; return str; }

const key = 'ABRACADABRA';
const input = 'Advanced Test';
const inputBytes = new TextEncoder().encode(input);
const checksum = inputBytes.reduce((a, b) => a + b, 0) % 256;
let data = new Uint8Array(inputBytes.length + 1);
data.set(inputBytes, 0); data[data.length - 1] = checksum;
let compressed = pako.gzip(data); if (compressed.length >= data.length) compressed = data;

// Encrypt with StrongIV
const rb = [42, 17, 99, 200, 55, 128, 33, 166, 88, 211, 44, 177, 66, 199, 11, 254];
let KeyHash = CryptoJS.SHA256(key);
let ivArray = new Uint8Array(16); for (let i = 0; i < 16; i++) ivArray[i] = rb[i];
const enc = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(compressed), KeyHash, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding, iv: CryptoJS.lib.WordArray.create(ivArray) });
const cipherBytes = wordToUint8(enc.ciphertext);

let withRb = new Uint8Array(cipherBytes.length + 16);
withRb.set(cipherBytes, 0); withRb.set(rb, cipherBytes.length);
let withConfig = new Uint8Array(withRb.length + 1);
withConfig.set(withRb, 0); withConfig[withConfig.length - 1] = 1;

let b64 = removePadding(Base64.fromUint8Array(withConfig));
b64 = b64.slice(0, 5) + '+=' + b64.slice(5);

const chinese = enMap(b64);
console.log('Step 1: Chinese =', chinese.substring(0, 40));

// Decrypt
let deMapped = deMap(chinese);
console.log('Step 2: deMapped =', deMapped.substring(0, 40));
console.log('Step 2: Match =', deMapped === b64);

const hasMarker = deMapped.includes('+=');
if (hasMarker) deMapped = deMapped.replace('+=', '');
console.log('Step 3: After marker =', deMapped.substring(0, 40));
console.log('Step 3: Match =', deMapped === b64.replace('+=', ''));

const padded = addPadding(deMapped);
console.log('Step 4: Padded length =', padded.length);

const decoded = Base64.toUint8Array(padded);
console.log('Step 5: Decoded length =', decoded.length, 'Expected =', withConfig.length);
console.log('Step 5: Decoded match =', decoded.join(',') === withConfig.join(','));

const cb = decoded[decoded.length - 1];
let sliced = decoded.slice(0, decoded.length - 1);
console.log('Step 6: Config byte =', cb, 'Expected =', 1);

const RandomBytes = new Array(16);
for (let i = 0; i < 16; i++) RandomBytes[15 - i] = sliced[sliced.byteLength - 1 - i];
sliced = sliced.subarray(0, sliced.byteLength - 16);
console.log('Step 7: RB match =', RandomBytes.join(',') === rb.join(','));
console.log('Step 7: Sliced length =', sliced.length, 'Expected =', cipherBytes.length);
console.log('Step 7: Sliced match =', sliced.join(',') === cipherBytes.join(','));

// Decrypt
let KeyHash2 = CryptoJS.SHA256(key);
let ivArray2 = new Uint8Array(16); for (let i = 0; i < 16; i++) ivArray2[i] = RandomBytes[i];
const dec = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(sliced), KeyHash2, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding, iv: CryptoJS.lib.WordArray.create(ivArray2) });
const decBytes = wordToUint8(dec.ciphertext);
console.log('Step 8: Dec bytes length =', decBytes.length, 'Expected =', compressed.length);
console.log('Step 8: Dec bytes match =', decBytes.join(',') === compressed.join(','));

let decompressed;
try { decompressed = pako.ungzip(decBytes); } catch { decompressed = decBytes; }
const final = decompressed.slice(0, decompressed.length - 1);
const result = new TextDecoder('utf-8').decode(final);
console.log('Step 9: Result =', result);
console.log('Step 9: Match =', result === input);
