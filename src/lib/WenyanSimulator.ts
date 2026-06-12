/**
 * WenyanSimulator - Chinese character mapping with triple rotor obfuscation
 * Simplified version ported from Abracadabra
 */

import { CHINESE_MAP } from './ChineseMapData';
import { RoundObfus } from './RoundObfusHelper';

export class WenyanSimulator {
  Map_Obj: any;
  RoundObufsHelper: RoundObfus;
  LETTERS: string;
  BIG_LETTERS: string;
  NUMBERS: string;
  SYMBOLS: string;
  NUMBERSYMBOL: string;
  NULL_STR = '孎';
  DecodeTable: Record<string, string[]>;
  PayloadLetter: string;

  constructor(key: string) {
    this.Map_Obj = CHINESE_MAP;
    this.LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.BIG_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.NUMBERS = '1234567890';
    this.SYMBOLS = '+/=';
    this.NUMBERSYMBOL = '0123456789+/=';
    this.DecodeTable = {};
    this.PayloadLetter = '';

    this.RoundObufsHelper = new RoundObfus(key);
    this.InitDecodeTable();
  }

  RoundKeyMatch(keyIn: string): string {
    return this.RoundObufsHelper.RoundKeyMatch(keyIn);
  }

  DRoundKeyMatch(keyIn: string): string {
    return this.RoundObufsHelper.DRoundKeyMatch(keyIn);
  }

  RoundKey(): void {
    this.RoundObufsHelper.RoundKey();
  }

  InitDecodeTable(): void {
    for (let i = 0; i < 52; i++) {
      this.DecodeTable[this.LETTERS[i]] = [];
      this.DecodeTable[this.LETTERS[i]].push(
        this.Map_Obj['Actual']['N']['alphabet'][this.LETTERS[i]]
      );
      this.DecodeTable[this.LETTERS[i]].push(
        this.Map_Obj['Actual']['A']['alphabet'][this.LETTERS[i]]
      );
      this.DecodeTable[this.LETTERS[i]].push(
        this.Map_Obj['Actual']['V']['alphabet'][this.LETTERS[i]]
      );
      this.PayloadLetter =
        this.PayloadLetter +
        this.Map_Obj['Actual']['N']['alphabet'][this.LETTERS[i]];
      this.PayloadLetter =
        this.PayloadLetter +
        this.Map_Obj['Actual']['A']['alphabet'][this.LETTERS[i]];
      this.PayloadLetter =
        this.PayloadLetter +
        this.Map_Obj['Actual']['V']['alphabet'][this.LETTERS[i]];
      if (
        this.Map_Obj['Actual']['A']['alphabet'][this.LETTERS[i]] !==
        this.Map_Obj['Actual']['AD']['alphabet'][this.LETTERS[i]]
      ) {
        this.DecodeTable[this.LETTERS[i]].push(
          this.Map_Obj['Actual']['AD']['alphabet'][this.LETTERS[i]]
        );
        this.PayloadLetter =
          this.PayloadLetter +
          this.Map_Obj['Actual']['AD']['alphabet'][this.LETTERS[i]];
      }
    }
    for (let i = 0; i < 13; i++) {
      this.DecodeTable[this.NUMBERSYMBOL[i]] = [];
      this.DecodeTable[this.NUMBERSYMBOL[i]].push(
        this.Map_Obj['Actual']['N']['numbersymbol'][this.NUMBERSYMBOL[i]]
      );
      this.DecodeTable[this.NUMBERSYMBOL[i]].push(
        this.Map_Obj['Actual']['A']['numbersymbol'][this.NUMBERSYMBOL[i]]
      );
      this.DecodeTable[this.NUMBERSYMBOL[i]].push(
        this.Map_Obj['Actual']['V']['numbersymbol'][this.NUMBERSYMBOL[i]]
      );
      this.PayloadLetter =
        this.PayloadLetter +
        this.Map_Obj['Actual']['N']['numbersymbol'][this.NUMBERSYMBOL[i]];
      this.PayloadLetter =
        this.PayloadLetter +
        this.Map_Obj['Actual']['A']['numbersymbol'][this.NUMBERSYMBOL[i]];
      this.PayloadLetter =
        this.PayloadLetter +
        this.Map_Obj['Actual']['V']['numbersymbol'][this.NUMBERSYMBOL[i]];
      if (
        this.Map_Obj['Actual']['A']['numbersymbol'][this.NUMBERSYMBOL[i]] !==
        this.Map_Obj['Actual']['AD']['numbersymbol'][this.NUMBERSYMBOL[i]]
      ) {
        this.DecodeTable[this.NUMBERSYMBOL[i]].push(
          this.Map_Obj['Actual']['AD']['numbersymbol'][this.NUMBERSYMBOL[i]]
        );
        this.PayloadLetter =
          this.PayloadLetter +
          this.Map_Obj['Actual']['AD']['numbersymbol'][this.NUMBERSYMBOL[i]];
      }
    }
  }

  getCryptText(text: string, type: string): string {
    let letter = text;
    let idx = this.LETTERS.indexOf(letter);
    let idx2 = this.BIG_LETTERS.indexOf(letter);
    let idx3 = this.NUMBERS.indexOf(letter);
    let idx4 = this.SYMBOLS.indexOf(letter);

    if (['N', 'V', 'A', 'AD'].indexOf(type) === -1) {
      return this.NULL_STR;
    }

    if (idx !== -1 || idx2 !== -1) {
      for (let key in this.Map_Obj['Actual'][type]['alphabet']) {
        if (this.Map_Obj['Actual'][type]['alphabet'].hasOwnProperty(key)) {
          if (key === letter) {
            return this.Map_Obj['Actual'][type]['alphabet'][this.RoundKeyMatch(key)];
          } else if (key.toUpperCase() === letter) {
            return String(this.Map_Obj['Actual'][type]['alphabet'][this.RoundKeyMatch(key.toUpperCase())]);
          }
        }
      }
    } else if (idx3 !== -1 || idx4 !== -1) {
      for (let key in this.Map_Obj['Actual'][type]['numbersymbol']) {
        if (this.Map_Obj['Actual'][type]['numbersymbol'].hasOwnProperty(key)) {
          if (key === letter) {
            return this.Map_Obj['Actual'][type]['numbersymbol'][this.RoundKeyMatch(key)];
          }
        }
      }
    }

    return this.NULL_STR;
  }

  findOriginText(text: string): string {
    let letter = text;
    let res: string | undefined;
    for (let key in this.DecodeTable) {
      this.DecodeTable[key].forEach((item) => {
        if (letter === item) {
          res = this.DRoundKeyMatch(key);
        }
      });
    }
    if (res) {
      return res;
    } else {
      return this.NULL_STR;
    }
  }

  // Simplified encryption mapping
  enMap(
    OriginStr: string,
    q: boolean,
    _r?: number,
    _rp?: [number, number],
    _p?: boolean,
    _l?: boolean,
    _t?: boolean
  ): string {
    let result = '';
    const types = ['N', 'V', 'A', 'AD'];

    this.RoundKey();

    for (let i = 0; i < OriginStr.length; i++) {
      let char = OriginStr[i];
      let type = types[i % types.length];
      let mapped = this.getCryptText(char, type);

      if (mapped !== this.NULL_STR) {
        result += mapped;
      }

      this.RoundKey();

      // Add punctuation occasionally
      if (q && i > 0 && i % 8 === 0) {
        result += '，';
      }
      if (q && i > 0 && i % 20 === 0) {
        result += '。';
      }
    }

    // Add ending punctuation
    if (q) {
      result += '。';
    }

    return result;
  }

  // Simplified decryption mapping
  deMap(OriginStr: string): string {
    let result = '';

    this.RoundKey();

    for (let i = 0; i < OriginStr.length; i++) {
      let char = OriginStr[i];

      // Skip punctuation
      const punct = '\uFF0C\u3002\u3001\uFF1B\uFF1A\uFF1F\uFF01\u201C\u201D\u2018\u2019\uFF08\uFF09\u3010\u3011\u300A\u300B';
      if (punct.includes(char)) {
        continue;
      }

      // Skip newlines and spaces
      if (char === '\n' || char === '\r' || char === ' ') {
        continue;
      }

      let origin = this.findOriginText(char);
      if (origin !== this.NULL_STR) {
        result += origin;
      }

      this.RoundKey();
    }

    return result;
  }
}
