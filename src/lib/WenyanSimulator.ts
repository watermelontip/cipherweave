/**
 * WenyanSimulator - Chinese character mapping
 * Uses same type order for encrypt/decrypt to ensure round-trip correctness
 */

import { CHINESE_MAP } from './ChineseMapData';
import { AddPadding } from './Misc';

export class WenyanSimulator {
  Map_Obj: any;
  LETTERS: string;
  NUMBERSYMBOL: string;
  NULL_STR = '孎';
  PayloadLetter: string;
  // Reverse maps per type for decryption
  ReverseMaps: Record<string, Record<string, string>>;

  constructor(_key: string) {
    this.Map_Obj = CHINESE_MAP;
    this.LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.NUMBERSYMBOL = '0123456789+/=';
    this.PayloadLetter = '';
    this.ReverseMaps = {};

    this.InitDecodeTable();
  }

  InitDecodeTable(): void {
    // Build reverse maps for each type
    for (const type of ['N', 'V', 'A', 'AD']) {
      this.ReverseMaps[type] = {};
      
      // Alphabet
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
      
      // Numbers and symbols
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

  getCryptText(text: string, type: string): string {
    if (['N', 'V', 'A', 'AD'].indexOf(type) === -1) {
      return this.NULL_STR;
    }

    // Check if it's a letter
    if (this.LETTERS.indexOf(text) !== -1) {
      const mapped = this.Map_Obj['Actual'][type]['alphabet'][text];
      return mapped || this.NULL_STR;
    }
    
    // Check if it's a number or symbol
    if (this.NUMBERSYMBOL.indexOf(text) !== -1) {
      const mapped = this.Map_Obj['Actual'][type]['numbersymbol'][text];
      return mapped || this.NULL_STR;
    }

    return this.NULL_STR;
  }

  isPayloadChar(char: string): boolean {
    return this.PayloadLetter.indexOf(char) !== -1;
  }

  // Encryption mapping
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

      // Add punctuation if enabled
      if (q) {
        if (i > 0 && (i + 1) % 7 === 0) {
          result += '，';
        }
        if (i > 0 && (i + 1) % 23 === 0) {
          result += '。';
        }
      }
    }

    // Add ending punctuation
    if (q && result.length > 0) {
      const lastChar = result[result.length - 1];
      if (lastChar !== '。' && lastChar !== '，') {
        result += '。';
      }
    }

    return result;
  }

  // Decryption mapping - uses SAME type order as encryption
  deMap(OriginStr: string): string {
    let result = '';

    // Filter out non-payload characters
    let filteredStr = '';
    for (let i = 0; i < OriginStr.length; i++) {
      const char = OriginStr[i];
      if (this.isPayloadChar(char)) {
        filteredStr += char;
      }
    }

    const types = ['N', 'V', 'A', 'AD'];

    // Reverse map each character using the SAME type order
    for (let i = 0; i < filteredStr.length; i++) {
      const char = filteredStr[i];
      const type = types[i % types.length];
      const origin = this.ReverseMaps[type][char];
      
      if (origin) {
        result += origin;
      }
    }

    // DEBUG: log intermediate values
    console.log('[CW-DEBUG] filtered:', filteredStr.length, 'decoded:', result.length);

    return result;
  }
}
