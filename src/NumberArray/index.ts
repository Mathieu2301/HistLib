export default class NumberArray {
  private static cToHex(c: string) {
    switch (c) {
      case '-': return 10;
      case '.': return 11;
      case 'e': return 12;
      default: return Number(c);
    }
  }
  
  private static hexToC(h: number) {
    switch (h) {
      case 10: return '-';
      case 11: return '.';
      case 12: return 'e';
      default: return String.fromCharCode(h + 48);
    }
  }

  private static numberToBinary(nbr: number) {
    if (nbr === Infinity) return '\xFF';
    if (nbr === -Infinity) return '\xAF';
    if (Number.isNaN(nbr)) return '\xAA';

    const s = `${nbr}`.replace('+', '');

    let rs = (s.length % 2 !== 0) ? String.fromCharCode(NumberArray.cToHex(s[0])) : '';

    for (let i = (s.length % 2 === 0 ? 0 : 1); i < s.length - 1; i += 2) {
      rs += String.fromCharCode(16 * NumberArray.cToHex(s[i]) + NumberArray.cToHex(s[i + 1]));
    }

    return rs;
  }

  private static binaryToNumber(hex: string) {
    if (hex === '\xFF') return Infinity;
    if (hex === '\xAF') return -Infinity;
    if (hex === '\xAA') return NaN;

    let s = '';
    for (let i = 0; i < hex.length; i += 1) {
      const n = hex.charCodeAt(i);
      if (i > 0 || n >= 16) s += NumberArray.hexToC(Math.floor(n / 16)) + NumberArray.hexToC(n % 16);
      else s += NumberArray.hexToC(n % 16);
    }

    return Number(s);
  }

  static toBinary(array: Array<number>) {
    return (array
      .map(NumberArray.numberToBinary)
      .join('\xFE')
    );
  }

  static fromBinary(binary: string) {
    return (binary
      .split('\xFE')
      .filter((s) => s !== '')
      .map(NumberArray.binaryToNumber)
    );
  }
}
