/**
 * Pure JavaScript QR Code Generator for Exhibition Kiosk
 * Generates clean, crisp SVG QR codes client-side with zero external dependencies.
 * Based on QR Code standard ISO/IEC 18004.
 */

export class QRCodeGenerator {
  /**
   * Generates an SVG string representation of a QR code for the given text.
   * @param {string} text - The URL or text to encode.
   * @param {Object} options - Options for generation.
   * @returns {string} - SVG markup.
   */
  static generateSVG(text, options = {}) {
    const size = options.size || 220;
    const color = options.color || '#00f0ff';
    const bg = options.background || '#070a17';
    const margin = options.margin !== undefined ? options.margin : 2;

    try {
      const qrData = QRCodeGenerator.create(text);
      const moduleCount = qrData.length;
      const totalSize = moduleCount + margin * 2;
      
      let rects = '';
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (qrData[r][c]) {
            const x = c + margin;
            const y = r + margin;
            rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" rx="0.15" />`;
          }
        }
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${size}" height="${size}" shape-rendering="crispEdges">
        <rect width="${totalSize}" height="${totalSize}" fill="${bg}" rx="1"/>
        ${rects}
      </svg>`;
    } catch (err) {
      console.warn("QR generator fallback:", err);
      return QRCodeGenerator.createFallbackSVG(text, size, color, bg);
    }
  }

  // Minimal standard QR Matrix builder supporting URLs up to 150 characters (Versions 1-6, Low ECC)
  static create(text) {
    // Mode: Byte mode (8-bit)
    const utf8Bytes = [];
    for (let i = 0; i < text.length; i++) {
      let code = text.charCodeAt(i);
      if (code < 0x80) utf8Bytes.push(code);
      else if (code < 0x800) {
        utf8Bytes.push(0xc0 | (code >> 6));
        utf8Bytes.push(0x80 | (code & 0x3f));
      } else {
        utf8Bytes.push(0xe0 | (code >> 12));
        utf8Bytes.push(0x80 | ((code >> 6) & 0x3f));
        utf8Bytes.push(0x80 | (code & 0x3f));
      }
    }

    // Version selection (Version 1: 17 bytes, V2: 32 bytes, V3: 53 bytes, V4: 78 bytes, V5: 106 bytes, V6: 134 bytes)
    const capacityTable = [
      { ver: 1, totalWords: 26, dataWords: 19, ecWords: 7, size: 21 },
      { ver: 2, totalWords: 44, dataWords: 34, ecWords: 10, size: 25 },
      { ver: 3, totalWords: 70, dataWords: 55, ecWords: 15, size: 29 },
      { ver: 4, totalWords: 100, dataWords: 80, ecWords: 20, size: 33 },
      { ver: 5, totalWords: 134, dataWords: 108, ecWords: 26, size: 37 },
      { ver: 6, totalWords: 172, dataWords: 136, ecWords: 36, size: 41 }
    ];

    let verInfo = capacityTable.find(v => utf8Bytes.length + 3 <= v.dataWords);
    if (!verInfo) verInfo = capacityTable[capacityTable.length - 1];

    const { ver, totalWords, dataWords, ecWords, size } = verInfo;

    // Build data bit stream: Mode Indicator (0100 = 4) + Char Count (8 bits) + Data + Terminator + Padding
    const bitBuffer = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) {
        bitBuffer.push((val >> i) & 1);
      }
    };

    pushBits(0b0100, 4); // Byte mode
    pushBits(utf8Bytes.length, 8); // Character count indicator
    for (const b of utf8Bytes) {
      pushBits(b, 8);
    }
    // Terminator (up to 4 zeroes)
    const maxDataBits = dataWords * 8;
    for (let i = 0; i < 4 && bitBuffer.length < maxDataBits; i++) {
      bitBuffer.push(0);
    }
    // Align to byte
    while (bitBuffer.length % 8 !== 0 && bitBuffer.length < maxDataBits) {
      bitBuffer.push(0);
    }
    // Pad bytes
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (bitBuffer.length < maxDataBits) {
      pushBits(padBytes[padIdx % 2], 8);
      padIdx++;
    }

    // Convert bit buffer to data words array
    const dataArray = [];
    for (let i = 0; i < bitBuffer.length; i += 8) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        byte = (byte << 1) | bitBuffer[i + b];
      }
      dataArray.push(byte);
    }

    // Reed-Solomon Error Correction Code Calculation
    const ecArray = QRCodeGenerator.calcErrorCorrection(dataArray, ecWords);
    const finalCodewords = dataArray.concat(ecArray);

    // Create matrix & setup function patterns
    const matrix = Array.from({ length: size }, () => Array(size).fill(null));
    const isReserved = Array.from({ length: size }, () => Array(size).fill(false));

    // Finder patterns
    const setFinder = (top, left) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const row = top + r;
          const col = left + c;
          if (row < 0 || row >= size || col < 0 || col >= size) continue;
          isReserved[row][col] = true;
          if ((r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
              (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
              (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[row][col] = true;
          } else {
            matrix[row][col] = false;
          }
        }
      }
    };

    setFinder(0, 0);
    setFinder(0, size - 7);
    setFinder(size - 7, 0);

    // Alignment pattern for V2+
    if (ver >= 2) {
      const alignCenter = size - 7;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const row = alignCenter + r;
          const col = alignCenter + c;
          isReserved[row][col] = true;
          if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
            matrix[row][col] = true;
          } else {
            matrix[row][col] = false;
          }
        }
      }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      if (!isReserved[6][i]) {
        matrix[6][i] = i % 2 === 0;
        isReserved[6][i] = true;
      }
      if (!isReserved[i][6]) {
        matrix[i][6] = i % 2 === 0;
        isReserved[i][6] = true;
      }
    }

    // Dark module & reserve format info
    matrix[size - 8][8] = true;
    isReserved[size - 8][8] = true;
    for (let i = 0; i < 9; i++) {
      isReserved[8][i] = true;
      isReserved[i][8] = true;
    }
    for (let i = size - 8; i < size; i++) {
      isReserved[8][i] = true;
      isReserved[i][8] = true;
    }

    // Place data bits in zigzag upward/downward columns
    let bitIdx = 0;
    const totalDataBits = finalCodewords.length * 8;
    let up = true;
    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right--; // Skip vertical timing column
      const colPairs = [right, right - 1];
      const rows = up
        ? Array.from({ length: size }, (_, i) => size - 1 - i)
        : Array.from({ length: size }, (_, i) => i);

      for (const row of rows) {
        for (const col of colPairs) {
          if (!isReserved[row][col]) {
            if (bitIdx < totalDataBits) {
              const byteVal = finalCodewords[Math.floor(bitIdx / 8)];
              const bit = (byteVal >> (7 - (bitIdx % 8))) & 1;
              matrix[row][col] = bit === 1;
              bitIdx++;
            } else {
              matrix[row][col] = false;
            }
          }
        }
      }
      up = !up;
    }

    // Mask pattern 0: (row + col) % 2 === 0
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isReserved[r][c]) {
          if ((r + c) % 2 === 0) {
            matrix[r][c] = !matrix[r][c];
          }
        }
      }
    }

    // Format info bits for Level L, Mask 0: 0b111011111000100
    const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
    const topCoords = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
    ];
    for (let i = 0; i < 15; i++) {
      matrix[topCoords[i][0]][topCoords[i][1]] = formatBits[i] === 1;
    }
    for (let i = 0; i < 7; i++) {
      matrix[size - 1 - i][8] = formatBits[i] === 1;
    }
    for (let i = 7; i < 15; i++) {
      matrix[8][size - 15 + i] = formatBits[i] === 1;
    }

    return matrix;
  }

  // Galois Field GF(256) arithmetic for Reed-Solomon ECC
  static calcErrorCorrection(data, ecCount) {
    const gfExp = new Uint8Array(512);
    const gfLog = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      gfExp[i] = x;
      gfLog[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) {
      gfExp[i] = gfExp[i - 255];
    }

    const gfMul = (a, b) => {
      if (a === 0 || b === 0) return 0;
      return gfExp[gfLog[a] + gfLog[b]];
    };

    // Generator polynomial
    let gen = [1];
    for (let i = 0; i < ecCount; i++) {
      const nextGen = new Array(gen.length + 1).fill(0);
      const root = gfExp[i];
      for (let j = 0; j < gen.length; j++) {
        nextGen[j] ^= gfMul(gen[j], root);
        nextGen[j + 1] ^= gen[j];
      }
      gen = nextGen;
    }

    // Division of polynomial
    const res = new Array(ecCount).fill(0);
    for (let i = 0; i < data.length; i++) {
      const factor = data[i] ^ res[0];
      for (let j = 0; j < ecCount - 1; j++) {
        res[j] = res[j + 1] ^ gfMul(gen[j + 1], factor);
      }
      res[ecCount - 1] = gfMul(gen[ecCount], factor);
    }
    return res;
  }

  static createFallbackSVG(text, size, color, bg) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
      <rect width="100" height="100" fill="${bg}" rx="8"/>
      <text x="50" y="45" font-size="8" fill="${color}" text-anchor="middle" font-family="sans-serif">SCAN URL:</text>
      <text x="50" y="58" font-size="6" fill="#a6b1d0" text-anchor="middle" font-family="monospace">${text.slice(0, 20)}...</text>
    </svg>`;
  }
}
