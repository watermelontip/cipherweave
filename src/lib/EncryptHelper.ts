/**
 * EncryptHelper - AES-256-CTR encryption/decryption
 * Ported from Abracadabra's EncryptHelper.js
 */

import CryptoJS from 'crypto-js';
import { wordArrayToUint8Array, GetRandomIndex } from './Misc';

export interface AdvancedEncConfig {
  Enable: boolean;
  UseStrongIV: boolean;
  UseHMAC: boolean;
  UsePBKDF2: boolean;
  UseTOTP: boolean;
  TOTPTimeStep: number;
  TOTPEpoch: number;
  TOTPBaseKey: string | null;
}

export const DEFAULT_ADVANCED_CONFIG: AdvancedEncConfig = {
  Enable: false,
  UseStrongIV: true,
  UseHMAC: false,
  UsePBKDF2: false,
  UseTOTP: false,
  TOTPTimeStep: 4,
  TOTPEpoch: Date.now(),
  TOTPBaseKey: null,
};

function AES_256_CTR_E(Uint8attr: Uint8Array, key: string, RandomBytes: number[]): Uint8Array {
  let KeyHash = CryptoJS.SHA256(key);
  let HashArray = wordArrayToUint8Array(KeyHash);

  const TempArray = new Uint8Array(HashArray.byteLength + 2);
  TempArray.set(HashArray, 0);
  TempArray.set([RandomBytes[0], RandomBytes[1]], HashArray.byteLength);
  HashArray = TempArray;

  const HashWithRandom = CryptoJS.lib.WordArray.create(HashArray);
  const KeyHashHash = CryptoJS.SHA256(HashWithRandom);
  const HashHashArray = wordArrayToUint8Array(KeyHashHash);

  const ivArray = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    ivArray[i] = HashHashArray[i];
  }

  const iv = CryptoJS.lib.WordArray.create(ivArray);
  const msg = CryptoJS.lib.WordArray.create(Uint8attr);

  const Enc = CryptoJS.AES.encrypt(msg, KeyHash, {
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding,
    iv: iv,
  });
  return wordArrayToUint8Array(Enc.ciphertext);
}

function AES_256_CTR_HMAC_SHA256_E(
  Uint8attr: Uint8Array,
  key: string,
  RandomBytes: number[],
  AdvancedEncObj: AdvancedEncConfig
): Uint8Array {
  let KeyHash = CryptoJS.SHA256(key);
  let HashArray = wordArrayToUint8Array(KeyHash);
  let HMAC_HASH: any = null;
  let ivArray = new Uint8Array();
  let salt: any = null;
  let ResultLength = 0;

  if (AdvancedEncObj.UseStrongIV) {
    ivArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      ivArray[i] = RandomBytes[i];
    }
  } else {
    const TempArray = new Uint8Array(HashArray.byteLength + 2);
    TempArray.set(HashArray, 0);
    TempArray.set([RandomBytes[0], RandomBytes[1]], HashArray.byteLength);
    HashArray = TempArray;

    const HashWithRandom = CryptoJS.lib.WordArray.create(HashArray);
    const KeyHashHash = CryptoJS.SHA256(HashWithRandom);
    const HashHashArray = wordArrayToUint8Array(KeyHashHash);

    ivArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      ivArray[i] = HashHashArray[i];
    }
  }

  if (AdvancedEncObj.UsePBKDF2) {
    if (AdvancedEncObj.UseTOTP) {
      // For TOTP, we derive the key using a simple hash-based approach
      const BaseKeyHash = CryptoJS.SHA256(
        AdvancedEncObj.TOTPBaseKey !== null ? AdvancedEncObj.TOTPBaseKey : key
      );
      salt = BaseKeyHash.toString(CryptoJS.enc.Base64).substring(0, 16);
      const key256Bits = CryptoJS.PBKDF2(key, salt, {
        keySize: 256 / 32,
        iterations: 100000,
      });
      KeyHash = key256Bits;
    } else {
      salt = CryptoJS.lib.WordArray.random(16);
      const key256Bits = CryptoJS.PBKDF2(key, salt, {
        keySize: 256 / 32,
        iterations: 100000,
      });
      KeyHash = key256Bits;
      ResultLength += 16;
    }
  }

  const iv = CryptoJS.lib.WordArray.create(ivArray);
  const msg = CryptoJS.lib.WordArray.create(Uint8attr);

  const Enc = CryptoJS.AES.encrypt(msg, KeyHash, {
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding,
    iv: iv,
  });

  if (AdvancedEncObj.UseHMAC) {
    const Cipher = wordArrayToUint8Array(Enc.ciphertext);
    const CipherWA = CryptoJS.lib.WordArray.create(Cipher);
    HMAC_HASH = CryptoJS.HmacSHA256(CipherWA, KeyHash);
    ResultLength += 32;
  }

  const CipherTextLength = wordArrayToUint8Array(Enc.ciphertext).byteLength;
  ResultLength += CipherTextLength;

  const EncResult = new Uint8Array(ResultLength);
  EncResult.set(wordArrayToUint8Array(Enc.ciphertext), 0);

  if (AdvancedEncObj.UseHMAC) {
    EncResult.set(wordArrayToUint8Array(HMAC_HASH), CipherTextLength);
  }
  if (AdvancedEncObj.UsePBKDF2 && !AdvancedEncObj.UseTOTP) {
    EncResult.set(
      wordArrayToUint8Array(salt),
      AdvancedEncObj.UseHMAC ? CipherTextLength + 32 : CipherTextLength
    );
  }

  return EncResult;
}

function AES_256_CTR_HMAC_SHA256_D(
  Uint8attr: Uint8Array,
  key: string,
  RandomBytes: number[],
  AdvancedEncObj: AdvancedEncConfig
): Uint8Array {
  let KeyHash = CryptoJS.SHA256(key);
  let HashArray = wordArrayToUint8Array(KeyHash);
  let ivArray = new Uint8Array();

  if (AdvancedEncObj.UseStrongIV) {
    ivArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      ivArray[i] = RandomBytes[i];
    }
  } else {
    const TempArray = new Uint8Array(HashArray.byteLength + 2);
    TempArray.set(HashArray, 0);
    TempArray.set([RandomBytes[0], RandomBytes[1]], HashArray.byteLength);
    HashArray = TempArray;

    const HashWithRandom = CryptoJS.lib.WordArray.create(HashArray);
    const KeyHashHash = CryptoJS.SHA256(HashWithRandom);
    const HashHashArray = wordArrayToUint8Array(KeyHashHash);

    ivArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      ivArray[i] = HashHashArray[i];
    }
  }

  let salt = new Uint8Array(16);
  let data = Uint8attr;

  if (AdvancedEncObj.UsePBKDF2 && !AdvancedEncObj.UseTOTP) {
    for (let i = 0; i < 16; i++) {
      salt[15 - i] = data.at(data.byteLength - 1 - i)!;
    }
    data = data.subarray(0, data.byteLength - 16);
    const key256Bits = CryptoJS.PBKDF2(key, CryptoJS.lib.WordArray.create(salt), {
      keySize: 256 / 32,
      iterations: 100000,
    });
    KeyHash = key256Bits;
  } else if (AdvancedEncObj.UsePBKDF2 && AdvancedEncObj.UseTOTP) {
    const BaseKeyHash = CryptoJS.SHA256(
      AdvancedEncObj.TOTPBaseKey !== null ? AdvancedEncObj.TOTPBaseKey : key
    );
    const saltStr = BaseKeyHash.toString(CryptoJS.enc.Base64).substring(0, 16);
    const key256Bits = CryptoJS.PBKDF2(key, saltStr, {
      keySize: 256 / 32,
      iterations: 100000,
    });
    KeyHash = key256Bits;
  }

  if (AdvancedEncObj.UseHMAC) {
    const HMAC_HASH = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      HMAC_HASH[31 - i] = data.at(data.byteLength - 1 - i)!;
    }
    data = data.subarray(0, data.byteLength - 32);

    const ciphertext = CryptoJS.lib.WordArray.create(data);
    const HMAC_HASH_B = wordArrayToUint8Array(
      CryptoJS.HmacSHA256(ciphertext, KeyHash)
    );

    if (HMAC_HASH.byteLength !== HMAC_HASH_B.byteLength) {
      throw 'Error Decrypting. HMAC Mismatch.';
    }

    for (let i = 0; i < HMAC_HASH.byteLength; i++) {
      if (HMAC_HASH[i] !== HMAC_HASH_B[i]) {
        throw 'Error Decrypting. HMAC Mismatch.';
      }
    }
  }

  const iv = CryptoJS.lib.WordArray.create(ivArray);
  const msg = CryptoJS.lib.WordArray.create(data);

  const Dec = CryptoJS.AES.encrypt(msg, KeyHash, {
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding,
    iv: iv,
  });

  return wordArrayToUint8Array(Dec.ciphertext);
}

export function Encrypt(
  OriginalData: Uint8Array,
  key: string,
  AdvancedEncObj: AdvancedEncConfig = DEFAULT_ADVANCED_CONFIG
): Uint8Array {
  const RandomBytes: number[] = [];
  let TempArray: Uint8Array;

  if (!AdvancedEncObj.Enable) {
    RandomBytes.push(GetRandomIndex(256));
    RandomBytes.push(GetRandomIndex(256));

    OriginalData = AES_256_CTR_E(OriginalData, key, RandomBytes);

    TempArray = new Uint8Array(OriginalData.byteLength + 2);
    TempArray.set(OriginalData, 0);
    TempArray.set(RandomBytes, OriginalData.byteLength);
  } else {
    if (AdvancedEncObj.UseStrongIV) {
      for (let i = 0; i < 16; i++) {
        RandomBytes.push(GetRandomIndex(256));
      }
    } else {
      RandomBytes.push(GetRandomIndex(256));
      RandomBytes.push(GetRandomIndex(256));
    }

    OriginalData = AES_256_CTR_HMAC_SHA256_E(OriginalData, key, RandomBytes, AdvancedEncObj);

    if (AdvancedEncObj.UseStrongIV) {
      TempArray = new Uint8Array(OriginalData.byteLength + 16);
      TempArray.set(OriginalData, 0);
      TempArray.set(RandomBytes, OriginalData.byteLength);
    } else {
      TempArray = new Uint8Array(OriginalData.byteLength + 2);
      TempArray.set(OriginalData, 0);
      TempArray.set(RandomBytes, OriginalData.byteLength);
    }
  }
  OriginalData = TempArray;
  return OriginalData;
}

export function Decrypt(Data: Uint8Array, key: string, AdvancedEncObj: AdvancedEncConfig | null = null): Uint8Array {
  if (!AdvancedEncObj) {
    const RandomBytes = [0, 0];
    RandomBytes[1] = Data.at(Data.byteLength - 1)!;
    RandomBytes[0] = Data.at(Data.byteLength - 2)!;

    Data = Data.subarray(0, Data.byteLength - 2);
    Data = AES_256_CTR_E(Data, key, RandomBytes);
    return Data;
  } else {
    let RandomBytes: number[];
    if (AdvancedEncObj.UseStrongIV) {
      RandomBytes = new Array(16);
      for (let i = 0; i < 16; i++) {
        RandomBytes[15 - i] = Data.at(Data.byteLength - 1 - i)!;
      }
      Data = Data.subarray(0, Data.byteLength - 16);
    } else {
      RandomBytes = [0, 0];
      RandomBytes[1] = Data.at(Data.byteLength - 1)!;
      RandomBytes[0] = Data.at(Data.byteLength - 2)!;
      Data = Data.subarray(0, Data.byteLength - 2);
    }
    Data = AES_256_CTR_HMAC_SHA256_D(Data, key, RandomBytes, AdvancedEncObj);
    return Data;
  }
}
