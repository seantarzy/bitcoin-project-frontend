export const addCommas = (numberString: string): string => {
  let wholeNums;
  let decimalNums;
  if (!numberString.includes(".")) {
    wholeNums = numberString;
    decimalNums = "00";
  } else {
    let numberStringArray = numberString.split(".");
    wholeNums = numberStringArray[0];
    decimalNums = numberStringArray[1];
  }
  let length = wholeNums.length;
  if (length < 4) {
    return numberString;
  }
  if (length > 3 && length < 7) {
    return (
      wholeNums.substring(0, length - 3) +
      "," +
      wholeNums.substring(length - 3, length) +
      "." +
      decimalNums
    );
  }

  if (length > 6) {
    return (
      wholeNums.substring(0, length - 6) +
      "," +
      wholeNums.substring(length - 6, length - 3) +
      "," +
      wholeNums.substring(length - 3, length) +
      "." +
      decimalNums
    );
  }

  return numberString;
};
