/**
 * WenyanSimulator - Chinese character mapping
 * Uses same type order for encrypt/decrypt to ensure round-trip correctness
 */

import { CHINESE_MAP } from './ChineseMapData';
import * as OpenCC from 'opencc-js';

export class WenyanSimulator {
  Map_Obj: any;
  LETTERS: string;
  NUMBERSYMBOL: string;
  NULL_STR = '\u5B70';
  PayloadLetter: string;
  ReverseMaps: Record<string, Record<string, string>>;
  converter_s2t: any;
  converter_t2s: any;

  constructor(_key: string) {
    this.Map_Obj = CHINESE_MAP;
    this.LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.NUMBERSYMBOL = '0123456789+/=';
    this.PayloadLetter = '';
    this.ReverseMaps = {};

    this.converter_s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });
    this.converter_t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

    this.InitDecodeTable();
  }

  InitDecodeTable(): void {
    for (const type of ['N', 'V', 'A', 'AD']) {
      this.ReverseMaps[type] = {};
      for (let i = 0; i < this.LETTERS.length; i++) {
        const letter = this.LETTERS[i];
        const mapped = this.Map_Obj['Actual'][type]['alphabet'][letter];
        if (mapped) {
          this.ReverseMaps[type][mapped] = letter;
          if (this.PayloadLetter.indexOf(mapped) === -1) {
            this.PayloadLetter += mapped;
          }
        }
      }
      for (let i = 0; i < this.NUMBERSYMBOL.length; i++) {
        const symbol = this.NUMBERSYMBOL[i];
        const mapped = this.Map_Obj['Actual'][type]['numbersymbol'][symbol];
        if (mapped) {
          this.ReverseMaps[type][mapped] = symbol;
          if (this.PayloadLetter.indexOf(mapped) === -1) {
            this.PayloadLetter += mapped;
          }
        }
      }
    }
  }

  isPayloadChar(char: string): boolean {
    return this.PayloadLetter.indexOf(char) !== -1;
  }

  getCryptText(text: string, type: string): string {
    if (['N', 'V', 'A', 'AD'].indexOf(type) === -1) return this.NULL_STR;
    if (this.LETTERS.indexOf(text) !== -1) {
      const mapped = this.Map_Obj['Actual'][type]['alphabet'][text];
      return mapped || this.NULL_STR;
    }
    if (this.NUMBERSYMBOL.indexOf(text) !== -1) {
      const mapped = this.Map_Obj['Actual'][type]['numbersymbol'][text];
      return mapped || this.NULL_STR;
    }
    return this.NULL_STR;
  }

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

    for (let i = 0; i < OriginStr.length; i++) {
      const char = OriginStr[i];
      const type = types[i % types.length];
      const mapped = this.getCryptText(char, type);

      if (mapped !== this.NULL_STR) {
        result += mapped;
      }

      if (q) {
        if (i > 0 && (i + 1) % 7 === 0) {
          result += '\uFF0C';
        }
        if (i > 0 && (i + 1) % 23 === 0) {
          result += '\u3002';
        }
      }
    }

    if (q && result.length > 0) {
      const lastChar = result[result.length - 1];
      if (lastChar !== '\u3002' && lastChar !== '\uFF0C') {
        result += '\u3002';
      }
    }

    // Convert to Traditional Chinese if requested
    if (_t && result.length > 0) {
      result = this.converter_s2t(result);
    }

    return result;
  }

  deMap(OriginStr: string): string {
    let result = '';

    // Convert Traditional to Simplified first for decryption
    let inputStr = OriginStr;
    try {
      inputStr = this.converter_t2s(OriginStr);
    } catch {
      // If conversion fails, use original
    }

    let filteredStr = '';
    for (let i = 0; i < inputStr.length; i++) {
      const char = inputStr[i];
      if (this.isPayloadChar(char)) {
        filteredStr += char;
      }
    }

    const types = ['N', 'V', 'A', 'AD'];
    for (let i = 0; i < filteredStr.length; i++) {
      const char = filteredStr[i];
      const type = types[i % types.length];
      const origin = this.ReverseMaps[type][char];
      if (origin) {
        result += origin;
      }
    }

    return result;
  }
}
