export function decimalToTwosComplementHex(
  decimalNumber: string,
  bitLength: number = 64,
): string {
  const decimalBigInt: bigint = BigInt(decimalNumber);
  const isNegative: boolean = decimalBigInt < 0n;
  const absValue: bigint = isNegative ? -decimalBigInt : decimalBigInt;
  let hexString: string = absValue.toString(16);
  if (isNegative) {
    hexString = invertBits(hexString, bitLength);
  }
  while (hexString.length < bitLength / 4) {
    hexString = '0' + hexString;
  }
  return hexString;
}

function invertBits(hexString: string, bitLength: number): string {
  // Chuyển đổi từ hex sang nhị phân
  let binaryString: string = BigInt('0x' + hexString).toString(2);

  // Đảo bit
  binaryString = binaryString
    .padStart(bitLength, '0')
    .split('')
    .map((bit) => (bit === '0' ? '1' : '0'))
    .join('');

  // Cộng thêm 1
  binaryString = addOne(binaryString);

  // Chuyển đổi lại sang dạng hex
  hexString = BigInt('0b' + binaryString).toString(16);

  return hexString;
}

function addOne(binaryString: string): string {
  let carry: number = 1;
  let result: string = '';
  for (let i = binaryString.length - 1; i >= 0; i--) {
    const sum: number = parseInt(binaryString[i]) + carry;
    result = (sum % 2) + result;
    carry = sum > 1 ? 1 : 0;
  }
  return result;
}
