"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimAscii = exports.capitalize = void 0;
function capitalize(str) {
    return str[0].toUpperCase + str.slice(1);
}
exports.capitalize = capitalize;
function trimAscii(str) {
    let ws = ' \f\n\r\t\v';
    let i = 0, j = str.length - 1;
    while (i < str.length && ws.includes(str[i])) {
        i++;
    }
    while (j > i && ws.includes(str[j])) {
        j--;
    }
    return str.slice(i, j + 1);
}
exports.trimAscii = trimAscii;
