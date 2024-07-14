export function capitalize(str: string): string {
  return str[0].toUpperCase + str.slice(1);
}
export function trimAscii(str: string): string {
  let ws = ' \f\n\r\t\v';
  let i = 0, j = str.length-1;
  while(i < str.length && ws.includes(str[i])){ i++; }
  while(j > i && ws.includes(str[j])){ j--; }
  return str.slice(i, j+1);
}
