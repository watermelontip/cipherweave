/**
 * WenyanSimulator - Simplified Chinese character mapping
 * No rotor obfuscation for debugging
 */

import { CHINESE_MAP } from './ChineseMapData';
import { AddPadding } from './Misc';

export class WenyanSimulator {
  Map_Obj: any;
  LETTERS: string;
  NUMBERSYMBOL: string;
  NULL_STR = '孎';
  DecodeTable: Record<string, string[]>;
  PayloadLetter: string;

  constructor(_key: string) {
    this.Map_Obj = CHINESE_MAP;
    this.LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.NUMBERSYMBOL = '0123456789+/=';
    this.DecodeTable = {};
    this.PayloadLetter = '';

    this.InitDecodeTable();
  }

  InitDecodeTable(): void {
    // Initialize decode table for all Base64 characters
    for (let i = 0; i < 52; i++) {
      const letter = this.LETTERS[i];
      this.DecodeTable[letter] = [];
      
      // Add mappings from all word types (N, V, A, AD)
      for (const type of ['N', 'V', 'A', 'AD']) {
        const mapped = this.Map_Obj['Actual'][type]['alphabet'][letter];
        if (mapped && !this.DecodeTable[letter].includes(mapped)) {
          this.DecodeTable[letter].push(mapped);
          this.PayloadLetter += mapped;
        }
      }
    }
    
    // Add number/symbol mappings
    for (let i = 0; i < this.NUMBERSYMBOL.length; i++) {
      const symbol = this.NUMBERSYMBOL[i];
      this.DecodeTable[symbol] = [];
      
      for (const type of ['N', 'V', 'A', 'AD']) {
        const mapped = this.Map_Obj['Actual'][type]['numbersymbol'][symbol];
        if (mapped && !this.DecodeTable[symbol].includes(mapped)) {
          this.DecodeTable[symbol].push(mapped);
          this.PayloadLetter += mapped;
        }
      }
    }
  }

  getCryptText(text: string, type: string): string {
    let letter = text;
    
    if (['N', 'V', 'A', 'AD'].indexOf(type) === -1) {
      return this.NULL_STR;
    }

    // Check if it's a letter
    if (this.LETTERS.indexOf(letter) !== -1) {
      const mapped = this.Map_Obj['Actual'][type]['alphabet'][letter];
      return mapped || this.NULL_STR;
    }
    
    // Check if it's a number or symbol
    if (this.NUMBERSYMBOL.indexOf(letter) !== -1) {
      const mapped = this.Map_Obj['Actual'][type]['numbersymbol'][letter];
      return mapped || this.NULL_STR;
    }

    return this.NULL_STR;
  }

  findOriginText(text: string): string {
    // Search through all decode table entries
    for (const key in this.DecodeTable) {
      for (const mapped of this.DecodeTable[key]) {
        if (text === mapped) {
          return key;
        }
      }
    }
    return this.NULL_STR;
  }

  // Check if a character is a payload character (mapped to Base64)
  isPayloadChar(char: string): boolean {
    return this.PayloadLetter.indexOf(char) !== -1;
  }

  // Encryption mapping - converts Base64 string to Chinese characters
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

  // Decryption mapping - converts Chinese characters back to Base64
  deMap(OriginStr: string): string {
    let result = '';

    // Filter out non-payload characters (punctuation, spaces, etc.)
    let filteredStr = '';
    const skipChars = '\uFF0C\u3002\u3001\uFF1B\uFF1A\uFF1F\uFF01\u201C\u201D\u2018\u2019\uFF08\uFF09\u3010\u3011\u300A\u300B\n\r\t ';
    
    for (let i = 0; i < OriginStr.length; i++) {
      const char = OriginStr[i];
      if (skipChars.indexOf(char) === -1 && this.isPayloadChar(char)) {
        filteredStr += char;
      }
    }

    // Reverse map each character
    for (let i = 0; i < filteredStr.length; i++) {
      const char = filteredStr[i];
      const origin = this.findOriginText(char);
      
      if (origin !== this.NULL_STR) {
        result += origin;
      }
    }

    // Add padding to make valid Base64
    result = AddPadding(result);

    return result;
  }
}
