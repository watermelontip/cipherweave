/**
 * WenyanSimulator - Chinese character mapping with sentence generation
 * Full implementation with PianwenMode and LogicMode
 */

import { CHINESE_MAP } from './ChineseMapData';
import * as OpenCC from 'opencc-js';

function getRandomIndex(max: number): number {
  return Math.floor(Math.random() * max);
}

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

  // Distribute long payload into paragraphs
  distributePayload(payloadLength: number, min = 20, max = 80): number[] {
    const chunks: number[] = [];
    let remaining = payloadLength;
    let paragraphIndex = 0;

    while (remaining > 0) {
      let currentLen: number;
      if (remaining <= max) {
        currentLen = remaining;
      } else {
        const range = max - min;
        currentLen = min + getRandomIndex(range + 1);
        if (currentLen > remaining) currentLen = remaining;
      }
      chunks.push(currentLen);
      remaining -= currentLen;
      paragraphIndex++;
    }
    return chunks;
  }

  // Distribute integer into 3 parts
  distributeInteger(n: number): number[] {
    if (n <= 0) return [0, 0, 0];
    const base = Math.floor(n / 3);
    const remainder = n % 3;
    return [base + (remainder > 0 ? 1 : 0), base + (remainder > 1 ? 1 : 0), base];
  }

  // Select sentence templates
  selectSentence(
    payloadLength: number,
    randomIndex = 50,
    randomPragraphing: [number, number] = [20, 80],
    p = false,
    l = false
  ): string[][] {
    if (p && l) throw new Error('Contradictory Mode Setting');

    // If payload is too long, split into paragraphs
    if (payloadLength > randomPragraphing[1]) {
      const distributed = this.distributePayload(payloadLength, randomPragraphing[0], randomPragraphing[1]);
      let result: string[][] = [];
      for (const payload of distributed) {
        const subResult = this.selectSentence(payload, randomIndex, randomPragraphing, p, l);
        result = result.concat(subResult);
        if (result.length > 0) {
          result[result.length - 1].push('Z'); // Paragraph break marker
        }
      }
      return result;
    }

    const DividedPayload = this.distributeInteger(payloadLength);
    const SegmentedPayload: number[][] = [[], [], []];
    const ElementResult: string[][] = [];

    // Distribute payload to segments
    for (let i = 0; i < 3; i++) {
      const Payload = DividedPayload[i];
      let a = 0;
      while (a < Payload) {
        const selectRand = getRandomIndex(101) + randomIndex;
        const PossiblePayload: number[] = [];
        for (let b = 1; b <= Payload - a; b++) {
          if (b === 9) { PossiblePayload.push(b); break; }
          PossiblePayload.push(b);
        }

        let TargetPayload: number;
        if (selectRand <= 100) {
          // Greedy: prefer larger payloads
          if (PossiblePayload.length > 6) {
            const GreedyRand = getRandomIndex(91);
            if (GreedyRand < 30) TargetPayload = PossiblePayload[PossiblePayload.length - 3];
            else if (GreedyRand < 60) TargetPayload = PossiblePayload[PossiblePayload.length - 2];
            else TargetPayload = PossiblePayload[PossiblePayload.length - 1];
          } else {
            TargetPayload = PossiblePayload[PossiblePayload.length - 1];
          }
        } else {
          // Random selection
          TargetPayload = PossiblePayload[getRandomIndex(PossiblePayload.length)];
        }

        SegmentedPayload[i].push(TargetPayload!);
        a += TargetPayload!;
      }
    }

    // Select sentences for each segment
    const LibNames = ['Begin', 'Main', 'End'];
    for (let i = 0; i < 3; i++) {
      const Lib = LibNames[i];
      const templates = this.Map_Obj['Sentences'][Lib] || [];

      for (let a = 0; a < SegmentedPayload[i].length; a++) {
        const TargetPayload = SegmentedPayload[i][a];
        const PossibleSentences: string[][] = [];
        const PossiblePianSentences: string[][] = [];
        const PossibleLogicSentences: string[][] = [];

        for (let c = 0; c < templates.length; c++) {
          const Sentence = templates[c].split('/');
          const payload = parseInt(Sentence[0]);
          if (payload === TargetPayload) {
            PossibleSentences.push(Sentence.slice(1));
            const typeMarker = Sentence[0].length > 1 ? Sentence[0][1] : 'B';
            if (typeMarker === 'C' || typeMarker === 'E') {
              PossiblePianSentences.push(Sentence.slice(1));
            }
            if (typeMarker === 'D' || typeMarker === 'E') {
              PossibleLogicSentences.push(Sentence.slice(1));
            }
          }
        }

        let TargetSentence: string[];
        if (p) {
          // Force parallel prose
          TargetSentence = PossiblePianSentences.length > 0
            ? PossiblePianSentences[getRandomIndex(PossiblePianSentences.length)]
            : PossibleSentences[getRandomIndex(PossibleSentences.length)];
        } else if (l) {
          // Force logic
          TargetSentence = PossibleLogicSentences.length > 0
            ? PossibleLogicSentences[getRandomIndex(PossibleLogicSentences.length)]
            : PossibleSentences[getRandomIndex(PossibleSentences.length)];
        } else {
          // Random selection with bias
          const LogiRand = getRandomIndex(101);
          if (LogiRand > 25) {
            // 75% chance: random sentence
            TargetSentence = PossibleSentences[getRandomIndex(PossibleSentences.length)];
          } else {
            // 25% chance: prefer 骈文 or 逻辑
            const PianOrLogi = getRandomIndex(2);
            if (PianOrLogi === 0 && PossiblePianSentences.length > 0) {
              TargetSentence = PossiblePianSentences[getRandomIndex(PossiblePianSentences.length)];
            } else if (PossibleLogicSentences.length > 0) {
              TargetSentence = PossibleLogicSentences[getRandomIndex(PossibleLogicSentences.length)];
            } else {
              TargetSentence = PossibleSentences[getRandomIndex(PossibleSentences.length)];
            }
          }
        }

        ElementResult.push(TargetSentence);
      }
    }

    return ElementResult;
  }

  // Main encryption mapping
  enMap(
    OriginStr: string,
    q: boolean,
    r?: number,
    rp?: [number, number],
    p?: boolean,
    l?: boolean,
    _t?: boolean
  ): string {
    // If no sentence mode requested, use simple mapping
    if (!p && !l) {
      return this.enMapSimple(OriginStr, q, _t);
    }

    // Use sentence-based mapping
    return this.enMapSentence(OriginStr, q, r || 50, rp || [20, 80], p || false, l || false, _t);
  }

  // Simple mapping (no sentence structure)
  private enMapSimple(str: string, q: boolean, _t?: boolean): string {
    let result = '';
    const typeOrder = ['N', 'V', 'A', 'AD'];

    for (let i = 0; i < str.length; i++) {
      const type = typeOrder[i % 4];
      const mapped = this.getCryptText(str[i], type);
      if (mapped !== this.NULL_STR) result += mapped;

      if (q) {
        if (i > 0 && (i + 1) % 7 === 0) result += '\uFF0C';
        if (i > 0 && (i + 1) % 23 === 0) result += '\u3002';
      }
    }

    if (q && result.length > 0) {
      const lastChar = result[result.length - 1];
      if (lastChar !== '\u3002' && lastChar !== '\uFF0C') result += '\u3002';
    }

    if (_t && result.length > 0) {
      result = this.converter_s2t(result);
    }

    return result;
  }

  // Sentence-based mapping (骈文/逻辑优先)
  private enMapSentence(
    OriginStr: string,
    q: boolean,
    r: number,
    rp: [number, number],
    p: boolean,
    l: boolean,
    _t?: boolean
  ): string {
    let result = '';
    let payloadIndex = 0;
    const typeOrder = ['N', 'V', 'A', 'AD'];

    const Sentence = this.selectSentence(OriginStr.length, r, rp, p, l);

    for (let j = 0; j < Sentence.length; j++) {
      const sentence = Sentence[j];

      for (let k = 0; k < sentence.length; k++) {
        const token = sentence[k];

        if (token === 'V' || token === 'N' || token === 'A' || token === 'AD') {
          // Payload character - use fixed type order for round-trip correctness
          if (payloadIndex < OriginStr.length) {
            const type = typeOrder[payloadIndex % 4];
            const mapped = this.getCryptText(OriginStr[payloadIndex], type);
            if (mapped !== this.NULL_STR) result += mapped;
            payloadIndex++;
          }
        } else if (token === 'MV') {
          // Modal verb (random)
          const mvList = this.Map_Obj['Actual']['MV'];
          if (mvList && mvList.length > 0) {
            result += mvList[getRandomIndex(mvList.length)];
          }
        } else if (this.Map_Obj['Virtual'] && this.Map_Obj['Virtual'][token]) {
          // Virtual word (random from list)
          const vList = this.Map_Obj['Virtual'][token];
          result += vList[getRandomIndex(vList.length)];
        } else if (token === 'P') {
          // Period
          if (q) result += '\u3002';
        } else if (token === 'Z') {
          // Paragraph break
          if (q) result += '\u3002';
        } else if (token === 'R') {
          // Quote mark (skip for simplicity)
        } else {
          // Literal character (like 非, 若夫, etc.)
          result += token;
        }
      }

      // Add comma between sentences if enabled
      if (q && j < Sentence.length - 1) {
        const nextSentence = Sentence[j + 1];
        if (nextSentence && nextSentence.indexOf('P') === -1 && nextSentence.indexOf('Z') === -1) {
          result += '\uFF0C';
        }
      }
    }

    // Ensure ending punctuation
    if (q && result.length > 0) {
      const lastChar = result[result.length - 1];
      if (lastChar !== '\u3002' && lastChar !== '\uFF0C') {
        result += '\u3002';
      }
    }

    if (_t && result.length > 0) {
      result = this.converter_s2t(result);
    }

    return result;
  }

  // Decryption mapping
  deMap(OriginStr: string): string {
    let inputStr = OriginStr;
    try {
      inputStr = this.converter_t2s(OriginStr);
    } catch {}

    let filteredStr = '';
    for (let i = 0; i < inputStr.length; i++) {
      const char = inputStr[i];
      if (this.isPayloadChar(char)) {
        filteredStr += char;
      }
    }

    const typeOrder = ['N', 'V', 'A', 'AD'];
    let result = '';
    for (let i = 0; i < filteredStr.length; i++) {
      const char = filteredStr[i];
      const type = typeOrder[i % 4];
      const origin = this.ReverseMaps[type][char];
      if (origin) {
        result += origin;
      }
    }

    return result;
  }
}
