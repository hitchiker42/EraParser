"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("./parse");
const translate_1 = require("./translate");
const node_process_1 = __importDefault(require("node:process"));
function main() {
    let args = node_process_1.default.argv.slice(2);
    if (args.length < 1 || args.length > 3) {
        console.log("Usage: ${process.argv[0]} ${process.argv[1]} source [translation] [dest]");
    }
    let src = args[0];
    if (args.length == 1) {
        let ast = (0, parse_1.parseFile)(src);
        let lines = (0, parse_1.extractLines)(ast);
        console.log(JSON.stringify(lines));
    }
    else {
        let trFile = args[1];
        let dst = args[2];
        (0, translate_1.translateFile)(src, trFile, dst);
    }
    //ast.print();
    //console.log(ast.toCode());  
}
main();
