export const convertGlobStringToStringArray = (globString: string) => {
  const globArray = globString.split(",").map((str) => str.trim());

  return globArray;
};
