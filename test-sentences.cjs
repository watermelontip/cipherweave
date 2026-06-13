// Test PianwenMode and LogicMode round-trip
const fs = require('fs');
const CryptoJS = require('crypto-js');
const { Base64 } = require('js-base64');
const pako = require('pako');

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

function getRandomIndex(max) { return Math.floor(Math.random() * max); }
function getCryptText(ch, type) {
  if (LETTERS.includes(ch)) return MAP.Actual[type].alphabet[ch] || null;
  if (NUMSYM.includes(ch)) return MAP.Actual[type].numbersymbol[ch] || null;
  return null;
}
function wordToUint8(data) { const arr = new Uint8Array(data.sigBytes); for (let i = 0; i < data.sigBytes; i++) arr[i] = (data.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff; return arr; }
function removePadding(b64) { return b64.replace(/=+$/, ''); }
function addPadding(str) { const mod = str.length % 4; if (mod === 3) return str + '='; if (mod === 2) return str + '=='; return str; }
function getLuhnBit(data) { return data.reduce((a, b) => a + b, 0) % 256; }

function distributeInteger(n) {
  if (n <= 0) return [0, 0, 0];
  const base = Math.floor(n / 3);
  const remainder = n % 3;
  return [base + (remainder > 0 ? 1 : 0), base + (remainder > 1 ? 1 : 0), base];
}

function selectSentence(payloadLength, randomIndex, p, l) {
  if (payloadLength > 80) {
    const chunks = [];
    let remaining = payloadLength;
    while (remaining > 0) { const len = Math.min(remaining, 20 + getRandomIndex(61)); chunks.push(len); remaining -= len; }
    let result = [];
    for (const chunk of chunks) { result = result.concat(selectSentence(chunk, randomIndex, p, l)); if (result.length > 0) result[result.length - 1].push('Z'); }
    return result;
  }
  const DividedPayload = distributeInteger(payloadLength);
  const SegmentedPayload = [[], [], []];
  const ElementResult = [];
  for (let i = 0; i < 3; i++) {
    const Payload = DividedPayload[i];
    let a = 0;
    while (a < Payload) {
      const PossiblePayload = [];
      for (let b = 1; b <= Payload - a; b++) { if (b === 9) { PossiblePayload.push(b); break; } PossiblePayload.push(b); }
      const TargetPayload = PossiblePayload[PossiblePayload.length - 1];
      SegmentedPayload[i].push(TargetPayload);
      a += TargetPayload;
    }
  }
  const LibNames = ['Begin', 'Main', 'End'];
  for (let i = 0; i < 3; i++) {
    const templates = MAP.Sentences[LibNames[i]] || [];
    for (let a = 0; a < SegmentedPayload[i].length; a++) {
      const TargetPayload = SegmentedPayload[i][a];
      const PossibleSentences = [];
      const PossiblePianSentences = [];
      const PossibleLogicSentences = [];
      for (const t of templates) {
        const parts = t.split('/');
        if (parseInt(parts[0]) === TargetPayload) {
          PossibleSentences.push(parts.slice(1));
          const tm = parts[0].length > 1 ? parts[0][1] : 'B';
          if (tm === 'C' || tm === 'E') PossiblePianSentences.push(parts.slice(1));
          if (tm === 'D' || tm === 'E') PossibleLogicSentences.push(parts.slice(1));
        }
      }
      let TargetSentence;
      if (p && PossiblePianSentences.length > 0) TargetSentence = PossiblePianSentences[getRandomIndex(PossiblePianSentences.length)];
      else if (l && PossibleLogicSentences.length > 0) TargetSentence = PossibleLogicSentences[getRandomIndex(PossibleLogicSentences.length)];
      else TargetSentence = PossibleSentences[getRandomIndex(PossibleSentences.length)];
      ElementResult.push(TargetSentence);
    }
  }
  return ElementResult;
}

function enMapSentence(str, punctuation, p, l) {
  let result = '';
  let payloadIndex = 0;
  const typeOrder = ['N', 'V', 'A', 'AD'];
  const Sentence = selectSentence(str.length, 50, p, l);
  for (let j = 0; j < Sentence.length; j++) {
    const sentence = Sentence[j];
    for (let k = 0; k < sentence.length; k++) {
      const token = sentence[k];
      if (token === 'V' || token === 'N' || token === 'A' || token === 'AD') {
        if (payloadIndex < str.length) {
          const type = typeOrder[payloadIndex % 4];
          const mapped = getCryptText(str[payloadIndex], type);
          if (mapped) result += mapped;
          payloadIndex++;
        }
      } else if (token === 'MV') {
        const mvList = MAP.Actual.MV;
        if (mvList) result += mvList[getRandomIndex(mvList.length)];
      } else if (MAP.Virtual && MAP.Virtual[token]) {
        result += MAP.Virtual[token][getRandomIndex(MAP.Virtual[token].length)];
      } else if (token === 'P' || token === 'Z') {
        if (punctuation) result += '\u3002';
      } else if (token !== 'R') {
        result += token;
      }
    }
    if (punctuation && j < Sentence.length - 1) result += '\uFF0C';
  }
  if (punctuation && result.length > 0 && !result.endsWith('\u3002') && !result.endsWith('\uFF0C')) result += '\u3002';
  return result;
}

function deMap(str) {
  let filtered = '';
  for (let i = 0; i < str.length; i++) { if (PayloadLetter.includes(str[i])) filtered += str[i]; }
  let result = '';
  for (let i = 0; i < filtered.length; i++) { const type = types[i % 4]; const origin = ReverseMaps[type][filtered[i]]; if (origin) result += origin; }
  return result;
}

function testSentenceMode(name, input, key, punctuation, p, l) {
  const inputBytes = new TextEncoder().encode(input);
  const checksum = getLuhnBit(inputBytes);
  let data = new Uint8Array(inputBytes.length + 1);
  data.set(inputBytes, 0); data[data.length - 1] = checksum;
  let compressed;
  try { compressed = pako.gzip(data); if (compressed.length >= data.length) compressed = data; } catch { compressed = data; }

  const rb = [getRandomIndex(256), getRandomIndex(256)];
  let KeyHash = CryptoJS.SHA256(key);
  let HashArray = wordToUint8(KeyHash);
  const TempArray = new Uint8Array(HashArray.byteLength + 2);
  TempArray.set(HashArray, 0); TempArray.set([rb[0], rb[1]], HashArray.byteLength);
  const KeyHashHash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(TempArray));
  const HashHashArray = wordToUint8(KeyHashHash);
  const ivArray = new Uint8Array(16);
  for (let i = 0; i < 16; i++) ivArray[i] = HashHashArray[i];
  const enc = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(compressed), KeyHash, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding, iv: CryptoJS.lib.WordArray.create(ivArray) });
  const cipherBytes = wordToUint8(enc.ciphertext);
  let withRb = new Uint8Array(cipherBytes.length + 2);
  withRb.set(cipherBytes, 0); withRb[withRb.length - 2] = rb[0]; withRb[withRb.length - 1] = rb[1];

  let b64 = removePadding(Base64.fromUint8Array(withRb));
  const chinese = enMapSentence(b64, punctuation, p, l);

  let deMapped = deMap(chinese);
  const padded = addPadding(deMapped);
  const decoded = Base64.toUint8Array(padded);
  const rb2 = [decoded[decoded.byteLength - 2], decoded[decoded.byteLength - 1]];
  const encOnly = decoded.subarray(0, decoded.byteLength - 2);

  let KeyHash2 = CryptoJS.SHA256(key);
  let HashArray2 = wordToUint8(KeyHash2);
  const TempArray2 = new Uint8Array(HashArray2.byteLength + 2);
  TempArray2.set(HashArray2, 0); TempArray2.set([rb2[0], rb2[1]], HashArray2.byteLength);
  const KeyHashHash2 = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(TempArray2));
  const HashHashArray2 = wordToUint8(KeyHashHash2);
  const ivArray2 = new Uint8Array(16);
  for (let i = 0; i < 16; i++) ivArray2[i] = HashHashArray2[i];
  const dec = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(encOnly), KeyHash2, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding, iv: CryptoJS.lib.WordArray.create(ivArray2) });
  const decBytes = wordToUint8(dec.ciphertext);

  let decompressed;
  try { if (decBytes.length >= 2 && decBytes[0] === 0x1f && decBytes[1] === 0x8b) decompressed = pako.ungzip(decBytes); else decompressed = decBytes; } catch { decompressed = decBytes; }
  const final = decompressed.slice(0, decompressed.length - 1);
  const result = new TextDecoder().decode(final);

  const ok = result === input;
  console.log((ok ? '\u2705' : '\u274C') + ' ' + name + ': "' + chinese.substring(0, 50) + '..."');
  if (!ok) console.log('   Expected: "' + input + '" Got: "' + result + '"');
  return ok;
}

console.log('=== Sentence Mode Tests ===\n');
let passed = 0, failed = 0;
const tests = [
  ['\u9A88\u6587\u6A21\u5F0F(\u77ED\u6587)', 'Hello World!', 'ABRACADABRA', true, true, false],
  ['\u903B\u8F91\u4F18\u5148(\u77ED\u6587)', 'Hello World!', 'ABRACADABRA', true, false, true],
  ['\u9A88\u6587\u6A21\u5F0F(\u4E2D\u6587)', '\u4F60\u597D\u4E16\u754C\uFF01', 'ABRACADABRA', true, true, false],
  ['\u903B\u8F91\u4F18\u5148(\u4E2D\u6587)', '\u4F60\u597D\u4E16\u754C\uFF01', 'ABRACADABRA', true, false, true],
  ['\u9A88\u6587\u6A21\u5F0F(\u957F\u6587)', '\u8FD9\u662F\u4E00\u6BB5\u8F83\u957F\u7684\u6D4B\u8BD5\u6587\u672C\uFF0C\u7528\u4E8E\u9A8C\u8BC1\u53E5\u5F0F\u5F15\u64CE\u5728\u5904\u7406\u8F83\u957F\u5185\u5BB9\u65F6\u7684\u6B63\u786E\u6027\u3002', 'ABRACADABRA', true, true, false],
  ['\u903B\u8F91\u4F18\u5148(\u957F\u6587)', '\u8FD9\u662F\u4E00\u6BB5\u8F83\u957F\u7684\u6D4B\u8BD5\u6587\u672C\uFF0C\u7528\u4E8E\u9A8C\u8BC1\u53E5\u5F0F\u5F15\u64CE\u5728\u5904\u7406\u8F83\u957F\u5185\u5BB9\u65F6\u7684\u6B63\u786E\u6027\u3002', 'ABRACADABRA', true, false, true],
];
for (const [name, input, key, punct, p, l] of tests) {
  if (testSentenceMode(name, input, key, punct, p, l)) passed++; else failed++;
}
console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
if (failed > 0) console.log('\n\u26A0\uFE0F  Some sentence modes need fixing!');
else console.log('\n\ud83c\udf89 All sentence modes working correctly!');
