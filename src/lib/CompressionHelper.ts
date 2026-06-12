/**
 * CompressionHelper - Compression/decompression using pako (gzip)
 * Simplified from Abracadabra's CompressionHelper.js (Unishox2 not included)
 */

import pako from 'pako';

function GZIP_COMPRESS(Data: Uint8Array): Uint8Array {
  const DataOutput = pako.gzip(Data);
  if (DataOutput.byteLength >= Data.byteLength) {
    return Data;
  }
  return DataOutput;
}

function GZIP_DECOMPRESS(Data: Uint8Array): Uint8Array {
  const firstTwoBytes = new Uint8Array(Data.buffer, 0, 2);
  if (firstTwoBytes[0] === 0x1f && firstTwoBytes[1] === 0x8b) {
    return pako.ungzip(Data);
  }
  return Data;
}

export function Compress(OriginalData: Uint8Array): Uint8Array {
  return GZIP_COMPRESS(OriginalData);
}

export function Decompress(OriginalData: Uint8Array): Uint8Array {
  return GZIP_DECOMPRESS(OriginalData);
}
