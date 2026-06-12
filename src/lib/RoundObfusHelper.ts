/**
 * RoundObfusHelper - Triple rotor obfuscation (Enigma-like)
 * Ported from Abracadabra's RoundObfusHelper.js
 */

import CryptoJS from 'crypto-js';
import { wordArrayToUint8Array } from './Misc';

export class RoundObfus {
  RoundFlip = 0;
  RoundControl: Uint8Array;
  LETTERS_ROUND_1: string;
  LETTERS_ROUND_2: string;
  LETTERS_ROUND_3: string;
  NUMBERSYMBOL_ROUND_1: string;
  NUMBERSYMBOL_ROUND_2: string;
  NUMBERSYMBOL_ROUND_3: string;
  LETTERS: string;
  BIG_LETTERS: string;
  NUMBERS: string;
  SYMBOLS: string;
  NUMBERSYMBOL: string;
  NULL_STR = '孎';

  constructor(key: string) {
    this.LETTERS_ROUND_1 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.LETTERS_ROUND_2 = 'FbPoDRStyJKAUcdahfVXlqwnOGpHZejzvmrBCigQILxkYMuWTEsN';
    this.LETTERS_ROUND_3 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.NUMBERSYMBOL_ROUND_1 = '1234567890+/=';
    this.NUMBERSYMBOL_ROUND_2 = '5=0764+389/12';
    this.NUMBERSYMBOL_ROUND_3 = '1234567890+/=';
    this.LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.BIG_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.NUMBERS = '1234567890';
    this.SYMBOLS = '+/=';
    this.NUMBERSYMBOL = '0123456789+/=';

    const KeyHash = CryptoJS.SHA256(key);
    this.RoundControl = wordArrayToUint8Array(KeyHash);
  }

  _rotateString(str: string, n: number): string {
    return str.slice(n) + str.slice(0, n);
  }

  _LrotateString(str: string, n: number): string {
    return str.slice(str.length - n) + str.slice(0, str.length - n);
  }

  RoundKeyMatch(keyIn: string): string {
    let idx1, idx2;
    idx1 = this.LETTERS.indexOf(keyIn);
    idx2 = this.NUMBERSYMBOL.indexOf(keyIn);

    const idx1_1 = this.LETTERS.indexOf(this.LETTERS_ROUND_1[idx1] ?? '');
    const idx2_1 = this.NUMBERSYMBOL.indexOf(this.NUMBERSYMBOL_ROUND_1[idx2] ?? '');
    const idx1_2 = this.LETTERS.indexOf(this.LETTERS_ROUND_2[idx1_1] ?? '');
    const idx2_2 = this.NUMBERSYMBOL.indexOf(this.NUMBERSYMBOL_ROUND_2[idx2_1] ?? '');

    if (idx1 !== -1) {
      return this.LETTERS_ROUND_3[idx1_2] ?? this.NULL_STR;
    } else if (idx2 !== -1) {
      return this.NUMBERSYMBOL_ROUND_3[idx2_2] ?? this.NULL_STR;
    }
    return this.NULL_STR;
  }

  DRoundKeyMatch(keyIn: string): string {
    let idx1, idx2;
    idx1 = this.LETTERS_ROUND_3.indexOf(keyIn);
    idx2 = this.NUMBERSYMBOL_ROUND_3.indexOf(keyIn);

    const idx1_1 = this.LETTERS_ROUND_2.indexOf(this.LETTERS[idx1] ?? '');
    const idx2_1 = this.NUMBERSYMBOL_ROUND_2.indexOf(this.NUMBERSYMBOL[idx2] ?? '');
    const idx1_2 = this.LETTERS_ROUND_1.indexOf(this.LETTERS[idx1_1] ?? '');
    const idx2_2 = this.NUMBERSYMBOL_ROUND_1.indexOf(this.NUMBERSYMBOL[idx2_1] ?? '');

    if (idx1 !== -1) {
      return this.LETTERS[idx1_2] ?? this.NULL_STR;
    } else if (idx2 !== -1) {
      return this.NUMBERSYMBOL[idx2_2] ?? this.NULL_STR;
    }
    return this.NULL_STR;
  }

  RoundKey(): void {
    let ControlNum = 0;
    if (this.RoundFlip === 32) {
      this.RoundFlip = 0;
    }
    ControlNum = this.RoundControl[this.RoundFlip] % 10;
    if (ControlNum === 0) {
      ControlNum = 10;
    }

    if (ControlNum % 2 === 0) {
      this.LETTERS_ROUND_1 = this._rotateString(this.LETTERS_ROUND_1, 6);
      this.NUMBERSYMBOL_ROUND_1 = this._rotateString(this.NUMBERSYMBOL_ROUND_1, 6);
      this.LETTERS_ROUND_2 = this._LrotateString(this.LETTERS_ROUND_2, ControlNum);
      this.NUMBERSYMBOL_ROUND_2 = this._LrotateString(this.NUMBERSYMBOL_ROUND_2, ControlNum);
      this.LETTERS_ROUND_3 = this._rotateString(this.LETTERS_ROUND_3, ControlNum / 2 + 1);
      this.NUMBERSYMBOL_ROUND_3 = this._rotateString(this.NUMBERSYMBOL_ROUND_3, ControlNum / 2 + 1);
    } else {
      this.LETTERS_ROUND_1 = this._LrotateString(this.LETTERS_ROUND_1, 3);
      this.NUMBERSYMBOL_ROUND_1 = this._LrotateString(this.NUMBERSYMBOL_ROUND_1, 3);
      this.LETTERS_ROUND_2 = this._rotateString(this.LETTERS_ROUND_2, ControlNum);
      this.NUMBERSYMBOL_ROUND_2 = this._rotateString(this.NUMBERSYMBOL_ROUND_2, ControlNum);
      this.LETTERS_ROUND_3 = this._LrotateString(this.LETTERS_ROUND_3, (ControlNum + 7) / 2);
      this.NUMBERSYMBOL_ROUND_3 = this._LrotateString(this.NUMBERSYMBOL_ROUND_3, (ControlNum + 7) / 2);
    }
    this.RoundFlip++;
  }
}

/**
 * Old round obfuscation for legacy encryption mode
 */
export class RoundObfusOLD {
  RoundFlip = 0;
  RoundControl: Uint8Array;
  LETTERS_ROUND_1: string;
  LETTERS_ROUND_2: string;
  LETTERS_ROUND_3: string;
  NUMBERSYMBOL_ROUND_1: string;
  NUMBERSYMBOL_ROUND_2: string;
  NUMBERSYMBOL_ROUND_3: string;
  LETTERS: string;
  BIG_LETTERS: string;
  NUMBERS: string;
  SYMBOLS: string;
  NUMBERSYMBOL: string;
  NULL_STR = '孎';

  constructor(key: string) {
    this.LETTERS_ROUND_1 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.LETTERS_ROUND_2 = 'FbPoDRStyJKAUcdahfVXlqwnOGpHZejzvmrBCigQILxkYMuWTEsN';
    this.LETTERS_ROUND_3 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.NUMBERSYMBOL_ROUND_1 = '1234567890+=_-/?.>,<|`~!@#$%^&*(){}[];:';
    this.NUMBERSYMBOL_ROUND_2 = '~3{8}_-$[6(2^&#5|1*%0,<9:`+@7/?.>4=];!)';
    this.NUMBERSYMBOL_ROUND_3 = '1234567890+=_-/?.>,<|`~!@#$%^&*(){}[];:';
    this.LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.BIG_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.NUMBERS = '1234567890';
    this.SYMBOLS = '+=_-/?.>,<|`~!@#$%^&*(){}[];:';
    this.NUMBERSYMBOL = '1234567890+=_-/?.>,<|`~!@#$%^&*(){}[];:';

    const KeyHash = CryptoJS.SHA256(key);
    this.RoundControl = wordArrayToUint8Array(KeyHash);
  }

  _rotateString(str: string, n: number): string {
    return str.slice(n) + str.slice(0, n);
  }

  _LrotateString(str: string, n: number): string {
    return str.slice(str.length - n) + str.slice(0, str.length - n);
  }

  RoundKeyMatch(keyIn: string): string {
    const idx1 = this.LETTERS.indexOf(keyIn);
    const idx2 = this.NUMBERSYMBOL.indexOf(keyIn);

    const idx1_1 = this.LETTERS.indexOf(this.LETTERS_ROUND_1[idx1] ?? '');
    const idx2_1 = this.NUMBERSYMBOL.indexOf(this.NUMBERSYMBOL_ROUND_1[idx2] ?? '');
    const idx1_2 = this.LETTERS.indexOf(this.LETTERS_ROUND_2[idx1_1] ?? '');
    const idx2_2 = this.NUMBERSYMBOL.indexOf(this.NUMBERSYMBOL_ROUND_2[idx2_1] ?? '');

    if (idx1 !== -1) {
      return this.LETTERS_ROUND_3[idx1_2] ?? this.NULL_STR;
    } else if (idx2 !== -1) {
      return this.NUMBERSYMBOL_ROUND_3[idx2_2] ?? this.NULL_STR;
    }
    return this.NULL_STR;
  }

  DRoundKeyMatch(keyIn: string): string {
    const idx1 = this.LETTERS_ROUND_3.indexOf(keyIn);
    const idx2 = this.NUMBERSYMBOL_ROUND_3.indexOf(keyIn);

    const idx1_1 = this.LETTERS_ROUND_2.indexOf(this.LETTERS[idx1] ?? '');
    const idx2_1 = this.NUMBERSYMBOL_ROUND_2.indexOf(this.NUMBERSYMBOL[idx2] ?? '');
    const idx1_2 = this.LETTERS_ROUND_1.indexOf(this.LETTERS[idx1_1] ?? '');
    const idx2_2 = this.NUMBERSYMBOL_ROUND_1.indexOf(this.NUMBERSYMBOL[idx2_1] ?? '');

    if (idx1 !== -1) {
      return this.LETTERS[idx1_2] ?? this.NULL_STR;
    } else if (idx2 !== -1) {
      return this.NUMBERSYMBOL[idx2_2] ?? this.NULL_STR;
    }
    return this.NULL_STR;
  }

  RoundKey(): void {
    let ControlNum = 0;
    if (this.RoundFlip === 32) {
      this.RoundFlip = 0;
    }
    ControlNum = this.RoundControl[this.RoundFlip] % 10;
    if (ControlNum === 0) {
      ControlNum = 10;
    }

    if (ControlNum % 2 === 0) {
      this.LETTERS_ROUND_1 = this._rotateString(this.LETTERS_ROUND_1, 6);
      this.NUMBERSYMBOL_ROUND_1 = this._rotateString(this.NUMBERSYMBOL_ROUND_1, 6);
      this.LETTERS_ROUND_2 = this._LrotateString(this.LETTERS_ROUND_2, ControlNum * 2);
      this.NUMBERSYMBOL_ROUND_2 = this._LrotateString(this.NUMBERSYMBOL_ROUND_2, ControlNum * 2);
      this.LETTERS_ROUND_3 = this._rotateString(this.LETTERS_ROUND_3, ControlNum / 2 + 1);
      this.NUMBERSYMBOL_ROUND_3 = this._rotateString(this.NUMBERSYMBOL_ROUND_3, ControlNum / 2 + 1);
    } else {
      this.LETTERS_ROUND_1 = this._LrotateString(this.LETTERS_ROUND_1, 3);
      this.NUMBERSYMBOL_ROUND_1 = this._LrotateString(this.NUMBERSYMBOL_ROUND_1, 3);
      this.LETTERS_ROUND_2 = this._rotateString(this.LETTERS_ROUND_2, ControlNum);
      this.NUMBERSYMBOL_ROUND_2 = this._rotateString(this.NUMBERSYMBOL_ROUND_2, ControlNum);
      this.LETTERS_ROUND_3 = this._LrotateString(this.LETTERS_ROUND_3, (ControlNum + 7) / 2);
      this.NUMBERSYMBOL_ROUND_3 = this._LrotateString(this.NUMBERSYMBOL_ROUND_3, (ControlNum + 7) / 2);
    }
    this.RoundFlip++;
  }
}
