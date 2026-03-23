import { Buffer } from "node:buffer";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { describeRejectedSubmissionImage } from "../worker/data-retention";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(input: Buffer): number {
  let crc = 0xffffffff;
  for (let index = 0; index < input.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ input[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const payload = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload), 0);
  return Buffer.concat([length, payload, crc]);
}

function buildManyChunkPng(chunkCount: number): Uint8Array {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);

  const chunks = [PNG_SIGNATURE, pngChunk("IHDR", ihdr)];
  for (let index = 0; index < chunkCount; index += 1) {
    chunks.push(pngChunk("aaAa", Buffer.alloc(0)));
  }
  chunks.push(pngChunk("IEND", Buffer.alloc(0)));

  return Uint8Array.from(Buffer.concat(chunks));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

describe("PNG validation performance", () => {
  it("keeps many-chunk PNG policy checks under the local CPU guardrail", () => {
    const png = buildManyChunkPng(20000);
    expect(describeRejectedSubmissionImage(png, "image/png")).toBeNull();

    const durations: number[] = [];
    for (let run = 0; run < 25; run += 1) {
      const start = performance.now();
      const rejection = describeRejectedSubmissionImage(png, "image/png");
      durations.push(performance.now() - start);
      expect(rejection).toBeNull();
    }

    expect(median(durations)).toBeLessThan(10);
  });
});
