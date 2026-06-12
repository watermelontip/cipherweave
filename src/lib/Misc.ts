/**
 * Misc utility functions - ported from Abracadabra
 */

export class PreCheckResult {
  output: Uint8Array;
  isEncrypted: boolean;
  constructor(output: Uint8Array | string, isEncrypted = false) {
    if (typeof output === 'string') {
      this.output = stringToUint8Array(output);
    } else {
      this.output = output;
    }
    this.isEncrypted = isEncrypted;
  }
}

export function RemovePadding(Base64String: string): string {
  let PaddingCount = 0;
  for (let i = Base64String.length - 1; i >= Base64String.length - 4; i--) {
    if (Base64String[i] === '=') {
      PaddingCount++;
    }
  }
  return Base64String.slice(0, Base64String.length - PaddingCount);
}

export function AddPadding(Base64String: string): string {
  if (Base64String.length % 4 === 3) {
    return Base64String + '=';
  } else if (Base64String.length % 4 === 2) {
    return Base64String + '==';
  } else {
    return Base64String;
  }
}

export function setCharOnIndex(string: string, index: number, char: string): string {
  if (index > string.length - 1) return string;
  return string.substring(0, index) + char + string.substring(index + 1);
}

export function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Convert WordArray (crypto-js) to Uint8Array
export function wordArrayToUint8Array(data: any): Uint8Array {
  const dataArray = new Uint8Array(data.sigBytes);
  for (let i = 0; i < data.sigBytes; i++) {
    dataArray[i] = (data.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return dataArray;
}

export function Uint8ArrayTostring(fileData: Uint8Array): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(fileData);
}

export function GetRandomIndex(length: number): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return Math.floor((arr[0] / (0xffffffff + 1)) * length);
  }
  return Math.floor(Math.random() * length);
}

export function difference(arr1: any[], arr2: any[]): any[] {
  return arr1.filter((item) => !arr2.includes(item));
}

export function insertStringAtIndex(str: string, value: string, index: number): string {
  return str.slice(0, index) + value + str.slice(index);
}

export function GetLuhnBit(Data: Uint8Array): number {
  const Digit: number[] = [];
  for (let i = 0; i < Data.byteLength; i++) {
    let num = Data[i];
    while (num > 0) {
      const digit = num % 10;
      Digit.push(digit);
      num = Math.floor(num / 10);
    }
  }

  let sum = 0;
  for (let i = 0; i < Digit.length; i++) {
    if (i % 2 !== 0) {
      Digit[i] = Digit[i] * 2;
      if (Digit[i] >= 10) {
        Digit[i] = (Digit[i] % 10) + Math.floor(Digit[i] / 10);
      }
    }
    sum = sum + Digit[i];
  }

  return 10 - (sum % 10);
}

export function CheckLuhnBit(Data: Uint8Array): boolean {
  const DCheck = Data[Data.byteLength - 1];
  const Check = GetLuhnBit(Data.subarray(0, Data.byteLength - 1));
  return Check === DCheck;
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function packByte(b0: boolean | number, b1: boolean | number, b2: boolean | number, b3: boolean | number, size: number): number {
  const bits = [b0, b1, b2, b3].map((x) => (x ? 1 : 0));
  if (!Number.isInteger(size) || size < 0 || size > 15) {
    throw new RangeError('size must be integer in 0..15');
  }
  const byte = (size << 4) | (bits[3] << 3) | (bits[2] << 2) | (bits[1] << 1) | (bits[0] << 0);
  return byte & 0xff;
}

export function unpackByte(byte: number): {
  byte: number;
  size: number;
  bits: number[];
  flags: { b0: boolean; b1: boolean; b2: boolean; b3: boolean };
} {
  const size = (byte >> 4) & 0x0f;
  const b0 = (byte >> 0) & 1;
  const b1 = (byte >> 1) & 1;
  const b2 = (byte >> 2) & 1;
  const b3 = (byte >> 3) & 1;
  return {
    byte: byte & 0xff,
    size,
    bits: [b0, b1, b2, b3],
    flags: { b0: Boolean(b0), b1: Boolean(b1), b2: Boolean(b2), b3: Boolean(b3) },
  };
}

export function getStep(key: number): number {
  const steps = [180, 300, 600, 1800, 7200, 21600, 43200, 86400, 259200, 432000, 604800, 1814400, 2419200, 4838400, 14515200, 31557600];
  return steps[key] || 7200;
}

export class ValueNoise1D {
  seed: number;
  constructor(seed?: number) {
    this.seed = seed ?? Math.random();
  }

  random(x: number): number {
    const n = Math.sin(x * 12.9898 + this.seed) * 43758.5453;
    return n - Math.floor(n);
  }

  interpolate(a: number, b: number, blend: number): number {
    const theta = blend * Math.PI;
    const f = (1 - Math.cos(theta)) * 0.5;
    return a * (1 - f) + b * f;
  }

  get(x: number): number {
    const intX = Math.floor(x);
    const fracX = x - intX;
    const v1 = this.random(intX);
    const v2 = this.random(intX + 1);
    return this.interpolate(v1, v2, fracX);
  }
}

export function preCheck_OLD(inp: string): PreCheckResult {
  const SIG_DECRYPT_JP = '桜込凪雫実沢';
  const SIG_DECRYPT_CN = '玚俟玊欤瞐珏';
  const NULL_STR = '孎';

  let input = inp;
  let isEncrypted = false;
  let isJPFound = false;
  let isCNFound = false;

  for (let i = 0; i < input.length; i++) {
    const temp = input[i];
    if (SIG_DECRYPT_JP.indexOf(temp) !== -1) {
      input = setCharOnIndex(input, i, NULL_STR);
      isJPFound = true;
      continue;
    }
    if (SIG_DECRYPT_CN.indexOf(temp) !== -1) {
      input = setCharOnIndex(input, i, NULL_STR);
      isCNFound = true;
      continue;
    }
  }

  if (isJPFound && isCNFound) {
    isEncrypted = true;
  }

  return new PreCheckResult(stringToUint8Array(input), isEncrypted);
}
