"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateFileInPlace = exports.translateFile = void 0;
const parse_1 = require("./parse");
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
function generateDstFilename(srcFilename) {
    let base = path.basename(srcFilename, '.erb');
    return base + '_translated.erb';
}
/*
  Given a json formatted file of translations translate the given source erb file.

  The translation file should contain a json object with the original japanese lines
  as keys and the translations as values.
*/
function translateFile(srcFilename, translationFilename, dstFilename) {
    let ast = (0, parse_1.parseFile)(srcFilename);
    let translations = JSON.parse((0, node_fs_1.readFileSync)(translationFilename).toString());
    let cb = (node) => {
        if (node.isOutput()) {
            node.value = translations[node.value] ?? node.value;
        }
    };
    ast.walk(cb);
    if (!dstFilename) {
        dstFilename = generateDstFilename(srcFilename);
    }
    (0, node_fs_1.writeFileSync)(dstFilename, ast.toCode());
}
exports.translateFile = translateFile;
function translateFileInPlace(srcFilename, translationFilename) {
    let dstFilename = generateDstFilename(srcFilename);
    translateFile(srcFilename, translationFilename, dstFilename);
    (0, node_fs_1.renameSync)(srcFilename, dstFilename);
}
exports.translateFileInPlace = translateFileInPlace;
