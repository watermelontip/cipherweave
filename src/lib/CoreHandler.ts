/**
 * CoreHandler - Core encryption/decryption logic
 * Ported from Abracadabra's CoreHandler.js
 */

import { Base64 } from 'js-base64';
import { Compress, Decompress } from './CompressionHelper';
import { Encrypt, Decrypt } from './EncryptHelper';
import {
  Uint8ArrayTostring,
  GetLuhnBit,
  RemovePadding,
  AddPadding,
  packByte,
  unpackByte,
  GetRandomIndex,
} from './Misc';
import { WenyanSimulator } from './WenyanSimulator';

const ADVANCED_ENC_MAGIC = '+=';

export interface WenyanConfig {
  PunctuationMark: boolean;
  RandomIndex: number;
  RandomPragraphing: [number, number];
  PianwenMode: boolean;
  LogicMode: boolean;
  Traditional: boolean;
}

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

export function createDefaultWenyanConfig(): WenyanConfig {
  return {
    PunctuationMark: true,
    RandomIndex: 50,
    RandomPragraphing: [20, 80],
    PianwenMode: false,
    LogicMode: false,
    Traditional: false,
  };
}

export function createDefaultAdvancedConfig(): AdvancedEncConfig {
  return {
    Enable: false,
    UseStrongIV: true,
    UseHMAC: false,
    UsePBKDF2: false,
    UseTOTP: false,
    TOTPTimeStep: 4,
    TOTPEpoch: Date.now(),
    TOTPBaseKey: null,
  };
}

export function Enc(
  input: Uint8Array,
  key: string,
  wenyanConfig: WenyanConfig,
  advancedConfig: AdvancedEncConfig
): string {
  let WenyanSimulatorObj = new WenyanSimulator(key);

  let OriginalData = new Uint8Array(input) as Uint8Array<ArrayBuffer>;

  // Add checksum
  let TempArray = new Uint8Array(OriginalData.byteLength + 1);
  TempArray.set(OriginalData, 0);
  TempArray.set([GetLuhnBit(OriginalData)], OriginalData.byteLength);

  // Compress
  OriginalData = Compress(TempArray) as Uint8Array<ArrayBuffer>;

  // Encrypt
  OriginalData = Encrypt(OriginalData, key, advancedConfig) as Uint8Array<ArrayBuffer>;

  if (advancedConfig.Enable) {
    let byte = packByte(
      advancedConfig.UseStrongIV,
      advancedConfig.UseHMAC,
      advancedConfig.UsePBKDF2,
      advancedConfig.UseTOTP,
      advancedConfig.TOTPTimeStep
    );
    let TempArray2 = new Uint8Array(OriginalData.byteLength + 1);
    TempArray2.set(OriginalData, 0);
    TempArray2.set([byte], OriginalData.byteLength);
    OriginalData = TempArray2;
  }

  let OriginStr = RemovePadding(Base64.fromUint8Array(OriginalData));

  if (advancedConfig.Enable) {
    let InsertRange = OriginStr.length > 10 ? 10 : OriginStr.length - 1;
    let InsertIndex = GetRandomIndex(InsertRange);
    OriginStr =
      OriginStr.slice(0, InsertIndex) +
      ADVANCED_ENC_MAGIC +
      OriginStr.slice(InsertIndex);
  }

  // Map to Chinese characters
  let Res = WenyanSimulatorObj.enMap(
    OriginStr,
    wenyanConfig.PunctuationMark,
    wenyanConfig.RandomIndex,
    wenyanConfig.RandomPragraphing,
    wenyanConfig.PianwenMode,
    wenyanConfig.LogicMode,
    wenyanConfig.Traditional
  );

  return Res;
}

export function Dec(
  input: string,
  key: string,
  TOTPEpoch?: number | null,
  TOTPBaseKey?: string | null
): string {
  let WenyanSimulatorObj = new WenyanSimulator(key);

  // Decode Chinese characters to Base64
  let OriginStr = WenyanSimulatorObj.deMap(input);

  // Check for advanced encryption marker
  let AdvancedMarker = false;
  let AdvancedEncObj: AdvancedEncConfig | null = null;

  if (OriginStr.indexOf(ADVANCED_ENC_MAGIC) !== -1) {
    AdvancedMarker = true;
    OriginStr = OriginStr.replace(ADVANCED_ENC_MAGIC, '');
  }

  // Add padding
  OriginStr = AddPadding(OriginStr);

  let OriginalData = Base64.toUint8Array(OriginStr);

  if (AdvancedMarker) {
    // Extract advanced config byte
    let configByte = OriginalData[OriginalData.byteLength - 1];
    OriginalData = OriginalData.slice(0, OriginalData.byteLength - 1);

    let unpacked = unpackByte(configByte);
    AdvancedEncObj = {
      Enable: true,
      UseStrongIV: unpacked.flags.b0,
      UseHMAC: unpacked.flags.b1,
      UsePBKDF2: unpacked.flags.b2,
      UseTOTP: unpacked.flags.b3,
      TOTPTimeStep: unpacked.size,
      TOTPEpoch: TOTPEpoch || Date.now(),
      TOTPBaseKey: TOTPBaseKey || null,
    };
  } else {
    AdvancedEncObj = createDefaultAdvancedConfig();
  }

  // Decrypt
  OriginalData = Decrypt(OriginalData, key, AdvancedEncObj);

  // Decompress
  OriginalData = Decompress(OriginalData);

  // Remove checksum (last byte)
  let dataWithoutChecksum = OriginalData.slice(0, OriginalData.byteLength - 1);

  return Uint8ArrayTostring(dataWithoutChecksum);
}
