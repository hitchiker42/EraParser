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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLines = exports.parseAST = exports.parseFile = void 0;
const node_fs_1 = require("node:fs");
const node_1 = require("./node");
const util = __importStar(require("./util"));
const node_assert_1 = __importDefault(require("node:assert"));
//Convert unicode escapes into actual unicode characters
function unescapeUnicode(line) {
    let replacer = (_match, code) => String.fromCharCode(parseInt(code, 16));
    return line.replace(/[%_]UNICODE\(0x(\d+)\)[%_]/g, replacer);
}
function parseFile(filename) {
    let text = (0, node_fs_1.readFileSync)(filename);
    return parseAST(text.toString());
}
exports.parseFile = parseFile;
//NOTE: We need to be careful using \s to match whitespace in regexps
//In print statements ascii whitespace is ignored, but unicode whitespace isn't
function parseAST(text) {
    let outputRE = /((?:[KWN]STR.*?=)|(?:PRINT[^ \t]*))[ \t]*(.*)/;
    let i = 0;
    let root = new node_1.Node(node_1.NodeTypes.Root, '', null, true);
    let node = root;
    let lines = text.split('\n');
    while (i < lines.length) {
        //Can't use built in trim since it strips unicode spaces too
        let line = util.trimAscii(lines[i++]);
        if (line.length == 0) {
            continue;
        }
        let match = null;
        if ((match = line.match(/^(IF|ELSE(?:IF)?|SELECT|CASE(?:ELSE)|FOR)(?:CASE)?\s*([^;]*)?/))) { //Control flow
            let type = (0, node_1.stringToNodeType)(match[1]);
            let value = match[2];
            let parentType = null;
            //This could probably be done without the switch, but it works.
            switch (type) {
                case node_1.NodeTypes.For:
                case node_1.NodeTypes.Select:
                case node_1.NodeTypes.If:
                    //if/for/select create a new level of depth
                    node = new node_1.Node(type, value, node, true);
                    break;
                case node_1.NodeTypes.Case:
                case node_1.NodeTypes.CaseElse:
                    parentType = node_1.NodeTypes.Select;
                //Fallthrough
                case node_1.NodeTypes.ElseIf:
                case node_1.NodeTypes.Else:
                    parentType = parentType ?? node_1.NodeTypes.If;
                    //Keep all case/else(if)s as children of the same node
                    if (node.type != parentType) {
                        node = node.parent;
                        (0, node_assert_1.default)(node.type == parentType);
                    }
                    node = new node_1.Node(type, value, node, true);
            }
            node.parent.push(node);
        }
        else if ((match = line.match(/^((?:END(?:IF|SELECT))|NEXT)/))) { //control flow end
            if (node.isElse() || node.isCase()) {
                node = node.parent;
            }
            node.push(new node_1.Node(node_1.NodeTypes.End, match[1], node, false, node));
            node = node.parent;
        }
        else if ((match = line.match(/^@([^ \t]*)(?:[,(]([^;)]*))?/))) { //functions
            //Functions don't really have an explicit end, They Just end When theres a new function
            if (node.isFunction()) {
                node = node.parent;
            }
            if (node.type != node_1.NodeTypes.Root) {
                console.log(node.parent);
                throw new Error(`Unexpected Nested Function`);
            }
            node = new node_1.Node(node_1.NodeTypes.Function, match[1], node, true, match[2]);
            node.parent.push(node);
            //} else if((match = line.match(NodeTypes.^\$([^; \t]*)))){ //labels
            //      node.push(new Node(NodeTypes.Label, match[1]));
        }
        else if (line.startsWith(';')) { //comment
            let comment = line;
            let empty = 0;
            while (i < lines.length) {
                let line = lines[i].trimStart();
                if (line.startsWith(';')) {
                    //preserve empty lines between comments
                    if (empty) {
                        comment += '\n'.repeat(empty);
                        empty = 0;
                    }
                    comment += '\n' + lines[i].trimStart();
                }
                else if (line.length == 0) {
                    empty++;
                }
                else {
                    break;
                }
                i++;
            }
            node.push(new node_1.Node(node_1.NodeTypes.Comment, comment, node));
        }
        else if ((match = line.match(outputRE))) { //output
            //outputRE = /((?:[KWN]STR.*?=)|(?:PRINT[^ \t]*))[ \t]+(.*)/
            //I could try to match these in the initial regex, but that would be too complicated
            let matchTmp = match[1].match(/([KWN])STR|PRINT.*(.)/);
            if (matchTmp == null) {
                throw new Error("Output line regexp match failure: " + line);
            }
            let printType = "";
            if (matchTmp[1]) {
                printType = matchTmp[1] + '+';
            }
            else {
                printType = matchTmp[2] ?? 'N';
            }
            let newline = "KLW".includes(printType[0]);
            if (match[2]) {
                let content = unescapeUnicode(util.trimAscii(match[2]));
                // if(content.length > 1 && content != "「」"){
                //   node.content = true;
                // }
                let outputNode = new node_1.Node(node_1.NodeTypes.Output, content, node, false, printType);
                node.push(outputNode);
            }
            else if (newline) {
                node.push(new node_1.Node(node_1.NodeTypes.Output, '', node, false, printType));
            }
        }
        else {
            node.push(new node_1.Node(node_1.NodeTypes.Code, line, node));
        }
    }
    //NOTE: SIF is really weird, it conditionally executes the next line, I thought
    //it wouldn't skip comments/blank lines, but apparently it does.
    return root;
}
exports.parseAST = parseAST;
function extractLines(node) {
    let lines = [];
    let cb = (n) => {
        if (n.isOutput() && !(n.value == '\n' || n.value == '\\n')) {
            lines.push(n.value);
        }
    };
    node.walk(cb);
    return Object.fromEntries(lines.map(x => [x, null]));
}
exports.extractLines = extractLines;
