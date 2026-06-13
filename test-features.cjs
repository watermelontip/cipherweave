// CipherWeave Feature Test Script v2
// Tests all major features for round-trip correctness

const CryptoJS = require('crypto-js');
const { Base64 } = require('js-base64');
const pako = require('pako');
const fs = require('fs');
const OpenCC = require('opencc-js');

// Load Chinese map
const mapSrc = fs.readFileSync('src/lib/ChineseMapData.ts', 'utf-8');
const json = mapSrc.replace('export const CHINESE_MAP: any = ', '').replace(/;\s*$/, '');
const MAP = JSON.parse(json);

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMSYM = '0123456789+/=';
const types = ['N', 'V', 'A', 'AD'];

// Build reverse maps
const ReverseMaps = {};
let PayloadLetter = '';
for (const t of types) {
  ReverseMaps[t] = {};
  for (const l of LETTERS) {
    const m = MAP.Actual[t].alphabet[l];
    if (m) { ReverseMaps[t][m] = l; if (!PayloadLetter.includes(m)) PayloadLetter += m; }
  }
  for (const n of NUMSYM) {
    const m = MAP.Actual[t].numbersymbol[n];
    if (m) { ReverseMaps[t][m] = n; if (!PayloadLetter.includes(m)) PayloadLetter += m; }
  }
}

function getCryptText(ch, type) {
  if (LETTERS.includes(ch)) return MAP.Actual[type].alphabet[ch] || null;
  if (NUMSYM.includes(ch)) return MAP.Actual[type].numbersymbol[ch] || null;
  return null;
}

function enMap(str, punctuation, traditional) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const type = types[i % 4];
    const mapped = getCryptText(str[i], type);
    if (mapped) result += mapped;
    if (punctuation && i > 0 && (i + 1) % 7 === 0) result += '\uFF0C';
    if (punctuation && i > 0 && (i + 1) % 23 === 0) result += '\u3002';
  }
  if (punctuation && result.length > 0 && !result.endsWith('\u3002') && !result.endsWith('\uFF0C')) {
    result += '\u3002';
  }
  if (traditional) {
    const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    result = converter(result);
  }
  return result;
}

function deMap(str) {
  let inputStr = str;
  try {
    const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });
    inputStr = converter(str);
  } catch {}
  let filtered = '';
  for (let i = 0; i < inputStr.length; i++) {
    if (PayloadLetter.includes(inputStr[i])) filtered += inputStr[i];
  }
  let result = '';
  for (let i = 0; i < filtered.length; i++) {
    const type = types[i % 4];
    const origin = ReverseMaps[type][filtered[i]];
    if (origin) result += origin;
  }
  return result;
}

function wordToUint8(data) {
  const arr = new Uint8Array(data.sigBytes);
  for (let i = 0; i < data.sigBytes; i++) arr[i] = (data.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  return arr;
}

function getLuhnBit(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum % 256;
}

function removePadding(b64) { return b64.replace(/=+$/, ''); }

function addPadding(str) {
  const mod = str.length % 4;
  if (mod === 3) return str + '=';
  if (mod === 2) return str + '==';
  return str;
}

function packByte(b0, b1, b2, b3, size) {
  return (b0 ? 1 : 0) | (b1 ? 2 : 0) | (b2 ? 4 : 0) | (b3 ? 8 : 0) | ((size & 0xF) << 4);
}

function unpackByte(byte) {
  return {
    flags: { b0: !!(byte & 1), b1: !!(byte & 2), b2: !!(byte & 4), b3: !!(byte & 8) },
    size: (byte >> 4) & 0xF
  };
}

function getRandomIndex(max) { return Math.floor(Math.random() * max); }

// ===== AES helper (matches EncryptHelper.ts exactly) =====
function AES_256_CTR_E(Uint8attr, key, RandomBytes, AdvancedEncObj) {
  let KeyHash = CryptoJS.SHA256(key);
  let HashArray = wordToUint8(KeyHash);
  let ivArray;
  let ResultLength = 0;
  let HMAC_HASH = null;
  let salt = new Uint8Array(0);

  if (AdvancedEncObj && AdvancedEncObj.UseStrongIV) {
    ivArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) ivArray[i] = RandomBytes[i];
  } else {
    const TempArray = new Uint8Array(HashArray.byteLength + 2);
    TempArray.set(HashArray, 0);
    TempArray.set([RandomBytes[0], RandomBytes[1]], HashArray.byteLength);
    HashArray = TempArray;
    const HashWithRandom = CryptoJS.lib.WordArray.create(HashArray);
    const KeyHashHash = CryptoJS.SHA256(HashWithRandom);
    const HashHashArray = wordToUint8(KeyHashHash);
    ivArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) ivArray[i] = HashHashArray[i];
  }

  if (AdvancedEncObj && AdvancedEncObj.UsePBKDF2 && !AdvancedEncObj.UseTOTP) {
    salt = new Uint8Array(16);
    for (let i = 0; i < 16; i++) salt[i] = getRandomIndex(256);
    KeyHash = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.create(salt), { keySize: 256/32, iterations: 100000 });
    ResultLength += 16;
  }

  const iv = CryptoJS.lib.WordArray.create(ivArray);
  const msg = CryptoJS.lib.WordArray.create(Uint8attr);
  const Enc = CryptoJS.AES.encrypt(msg, KeyHash, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding, iv });

  const CipherBytes = wordToUint8(Enc.ciphertext);

  if (AdvancedEncObj && AdvancedEncObj.UseHMAC) {
    HMAC_HASH = CryptoJS.HmacSHA256(CryptoJS.lib.WordArray.create(CipherBytes), KeyHash);
    ResultLength += 32;
  }

  ResultLength += CipherBytes.length;

  const EncResult = new Uint8Array(ResultLength);
  EncResult.set(CipherBytes, 0);
  let offset = CipherBytes.length;
  if (HMAC_HASH) { EncResult.set(wordToUint8(HMAC_HASH), offset); offset += 32; }
  if (salt.length > 0) { EncResult.set(salt, offset); }

  return EncResult;
}

function AES_256_CTR_D(Data, key, RandomBytes, AdvancedEncObj) {
  let KeyHash = CryptoJS.SHA256(key);
  let HashArray = wordToUint8(KeyHash);
  let ivArray;

  if (AdvancedEncObj.UseStrongIV) {
    ivArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) ivArray[i] = RandomBytes[i];
  } else {
    const TempArray = new Uint8Array(HashArray.byteLength + 2);
    TempArray.set(HashArray, 0);
    TempArray.set([RandomBytes[0], RandomBytes[1]], HashArray.byteLength);
    HashArray = TempArray;
    const HashWithRandom = CryptoJS.lib.WordArray.create(HashArray);
    const KeyHashHash = CryptoJS.SHA256(HashWithRandom);
    const HashHashArray = wordToUint8(KeyHashHash);
    ivArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) ivArray[i] = HashHashArray[i];
  }

  let salt = new Uint8Array(16);
  let data = Data;

  // Extract PBKDF2 salt (reversed)
  if (AdvancedEncObj.UsePBKDF2 && !AdvancedEncObj.UseTOTP) {
    for (let i = 0; i < 16; i++) salt[15 - i] = data[data.byteLength - 1 - i];
    data = data.subarray(0, data.byteLength - 16);
    KeyHash = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.create(salt), { keySize: 256/32, iterations: 100000 });
  }

  // Extract HMAC (reversed)
  if (AdvancedEncObj.UseHMAC) {
    const HMAC_HASH = new Uint8Array(32);
    for (let i = 0; i < 32; i++) HMAC_HASH[31 - i] = data[data.byteLength - 1 - i];
    data = data.subarray(0, data.byteLength - 32);

    // Verify HMAC
    const HMAC_HASH_B = wordToUint8(CryptoJS.HmacSHA256(CryptoJS.lib.WordArray.create(data), KeyHash));
    for (let i = 0; i < 32; i++) {
      if (HMAC_HASH[i] !== HMAC_HASH_B[i]) throw new Error('HMAC Mismatch');
    }
  }

  const iv = CryptoJS.lib.WordArray.create(ivArray);
  const Dec = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(data), KeyHash, { mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding, iv });
  return wordToUint8(Dec.ciphertext);
}

// ===== Full round-trip test =====
function testRoundTrip(name, input, key, wenyanOpts, advancedOpts) {
  try {
    const inputBytes = new TextEncoder().encode(input);
    const checksum = getLuhnBit(inputBytes);
    let data = new Uint8Array(inputBytes.length + 1);
    data.set(inputBytes, 0);
    data[data.length - 1] = checksum;

    // Compress
    let compressed;
    try { compressed = pako.gzip(data); if (compressed.length >= data.length) compressed = data; } catch { compressed = data; }

    // Encrypt
    let encrypted;
    const isAdvanced = advancedOpts && advancedOpts.Enable;

    if (isAdvanced) {
      const rb = [];
      if (advancedOpts.UseStrongIV) { for (let i = 0; i < 16; i++) rb.push(getRandomIndex(256)); }
      else { rb.push(getRandomIndex(256)); rb.push(getRandomIndex(256)); }

      encrypted = AES_256_CTR_E(compressed, key, rb, advancedOpts);

      // Append random bytes
      if (advancedOpts.UseStrongIV) {
        let withRb = new Uint8Array(encrypted.length + 16);
        withRb.set(encrypted, 0);
        withRb.set(rb, encrypted.length);
        encrypted = withRb;
      } else {
        let withRb = new Uint8Array(encrypted.length + 2);
        withRb.set(encrypted, 0);
        withRb[withRb.length - 2] = rb[0];
        withRb[withRb.length - 1] = rb[1];
        encrypted = withRb;
      }

      // Append config byte
      const configByte = packByte(advancedOpts.UseStrongIV, advancedOpts.UseHMAC, advancedOpts.UsePBKDF2, false, 4);
      let withConfig = new Uint8Array(encrypted.length + 1);
      withConfig.set(encrypted, 0);
      withConfig[withConfig.length - 1] = configByte;
      encrypted = withConfig;
    } else {
      const rb = [getRandomIndex(256), getRandomIndex(256)];
      encrypted = AES_256_CTR_E(compressed, key, rb, null);
      let withRb = new Uint8Array(encrypted.length + 2);
      withRb.set(encrypted, 0);
      withRb[withRb.length - 2] = rb[0];
      withRb[withRb.length - 1] = rb[1];
      encrypted = withRb;
    }

    // Base64 encode
    let b64 = removePadding(Base64.fromUint8Array(encrypted));

    // Insert advanced marker
    if (isAdvanced) {
      const insertRange = b64.length > 10 ? 10 : b64.length - 1;
      const insertIndex = getRandomIndex(insertRange);
      b64 = b64.slice(0, insertIndex) + '+=' + b64.slice(insertIndex);
    }

    // Map to Chinese
    const chinese = enMap(b64, wenyanOpts.punctuation, wenyanOpts.traditional);

    // ===== Decrypt =====
    let deMapped = deMap(chinese);

    // Check advanced marker
    let decAdvanced = false;
    if (deMapped.includes('+=')) {
      decAdvanced = true;
      deMapped = deMapped.replace('+=', '');
    }

    const padded = addPadding(deMapped);
    const decoded = Base64.toUint8Array(padded);

    let decData;
    if (decAdvanced) {
      // Extract config byte
      const cb = decoded[decoded.length - 1];
      let sliced = decoded.slice(0, decoded.length - 1);
      const unpacked = unpackByte(cb);
      const decOpts = { UseStrongIV: unpacked.flags.b0, UseHMAC: unpacked.flags.b1, UsePBKDF2: unpacked.flags.b2, UseTOTP: unpacked.flags.b3 };

      // Extract random bytes (reversed for StrongIV)
      let RandomBytes;
      if (decOpts.UseStrongIV) {
        RandomBytes = new Array(16);
        for (let i = 0; i < 16; i++) RandomBytes[15 - i] = sliced[sliced.byteLength - 1 - i];
        sliced = sliced.subarray(0, sliced.byteLength - 16);
      } else {
        RandomBytes = [0, 0];
        RandomBytes[1] = sliced[sliced.byteLength - 1];
        RandomBytes[0] = sliced[sliced.byteLength - 2];
        sliced = sliced.subarray(0, sliced.byteLength - 2);
      }

      decData = AES_256_CTR_D(sliced, key, RandomBytes, decOpts);
    } else {
      const rb2 = [decoded[decoded.byteLength - 2], decoded[decoded.byteLength - 1]];
      const encOnly = decoded.subarray(0, decoded.byteLength - 2);
      decData = AES_256_CTR_D(encOnly, key, rb2, { UseUseStrongIV: false, UseUseHMAC: false, UseUsePBKDF2: false, UseTOTP: false });
    }

    // Decompress
    let decompressed;
    try {
      if (decData.length >= 2 && decData[0] === 0x1f && decData[1] === 0x8b) decompressed = pako.ungzip(decData);
      else decompressed = decData;
    } catch { decompressed = decData; }

    // Remove checksum
    const final = decompressed.slice(0, decompressed.length - 1);
    const result = new TextDecoder('utf-8').decode(final);

    const ok = result === input;
    console.log(`${ok ? '✅' : '❌'} ${name}: "${input}" → "${result}"`);
    return ok;
  } catch (e) {
    console.log(`❌ ${name}: ERROR - ${e.message}`);
    return false;
  }
}

// ===== Run tests =====
console.log('=== CipherWeave Feature Tests v2 ===\n');

let passed = 0, failed = 0;
const tests = [
  ['基本加解密', 'Hello World!', 'ABRACADABRA', { punctuation: true, traditional: false }, null],
  ['中文文本', '你好世界！这是一个测试。', 'ABRACADABRA', { punctuation: true, traditional: false }, null],
  ['无标点', 'Hello', 'ABRACADABRA', { punctuation: false, traditional: false }, null],
  ['繁体中文', 'Hello', 'ABRACADABRA', { punctuation: true, traditional: true }, null],
  ['自定义密钥', 'Secret Message', 'MySecretKey123', { punctuation: true, traditional: false }, null],
  ['高级(StrongIV)', 'Advanced Test', 'ABRACADABRA', { punctuation: true, traditional: false }, { Enable: true, UseStrongIV: true, UseHMAC: false, UsePBKDF2: false }],
  ['高级(HMAC)', 'HMAC Test', 'ABRACADABRA', { punctuation: true, traditional: false }, { Enable: true, UseStrongIV: true, UseHMAC: true, UsePBKDF2: false }],
  ['高级(PBKDF2)', 'PBKDF2 Test', 'ABRACADABRA', { punctuation: true, traditional: false }, { Enable: true, UseStrongIV: true, UseHMAC: false, UsePBKDF2: true }],
  ['高级(HMAC+PBKDF2)', 'Full Advanced', 'ABRACADABRA', { punctuation: true, traditional: false }, { Enable: true, UseStrongIV: true, UseHMAC: true, UsePBKDF2: true }],
  ['长文本', '这是一段很长的测试文本，用来验证加密解密在处理大量数据时是否正确工作。Hello World 123!@#', 'ABRACADABRA', { punctuation: true, traditional: false }, null],
  ['特殊字符', '!@#$%^&*()_+-=[]{}|;:",.<>?/~`', 'ABRACADABRA', { punctuation: true, traditional: false }, null],
];

for (const [name, input, key, wenyanOpts, advancedOpts] of tests) {
  if (testRoundTrip(name, input, key, wenyanOpts, advancedOpts)) passed++; else failed++;
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) console.log('\n⚠️  Some features need fixing!');
else console.log('\n🎉 All features working correctly!');
