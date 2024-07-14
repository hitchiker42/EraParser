import { readFileSync } from 'node:fs';
import { Node, NodeTypes, stringToNodeType, type NodeType } from './node';
import * as util from './util'
import assert from 'node:assert';

//Convert unicode escapes into actual unicode characters
function unescapeUnicode(line: string){
  let replacer = (_match: string, code: string) => String.fromCharCode(parseInt(code, 16));
  return line.replace(/[%_]UNICODE\(0x(\d+)\)[%_]/g, replacer);
}
export function parseFile(filename: string){
  let text = readFileSync(filename);
  return parseAST(text.toString());
}
//NOTE: We need to be careful using \s to match whitespace in regexps
//In print statements ascii whitespace is ignored, but unicode whitespace isn't
export function parseAST(text: string): Node {
  let outputRE = /((?:[KWN]STR.*?=)|(?:PRINT[^ \t]*))[ \t]*(.*)/
  let i = 0;
  let root = new Node(NodeTypes.Root, '', null, true);
  let node = root;
  let lines = text.split('\n');
  while(i < lines.length){
    //Can't use built in trim since it strips unicode spaces too
    let line = util.trimAscii(lines[i++]);
    if(line.length == 0){
      continue;
    }
    let match: RegExpMatchArray | null = null;
    if((match = line.match(/^(IF|ELSE(?:IF)?|SELECT|CASE(?:ELSE)|FOR)(?:CASE)?\s*([^;]*)?/))){ //Control flow
      let type = stringToNodeType(match[1]);
      let value = match[2];
      let parentType: NodeType | null = null;
      //This could probably be done without the switch, but it works.
      switch(type){
        case NodeTypes.For: 
        case NodeTypes.Select:
        case NodeTypes.If:
          //if/for/select create a new level of depth
          node = new Node(type, value, node, true);
          break;
        case NodeTypes.Case:
        case NodeTypes.CaseElse:
          parentType = NodeTypes.Select;
          //Fallthrough
        case NodeTypes.ElseIf:
        case NodeTypes.Else:
          parentType = parentType ?? NodeTypes.If;
          //Keep all case/else(if)s as children of the same node
          if(node.type != parentType){
            node = node.parent;
            assert(node.type == parentType);
          }
          node = new Node(type, value, node, true);
      }
      node.parent.push(node);
    } else if((match = line.match(/^((?:END(?:IF|SELECT))|NEXT)/))){ //control flow end
      if(node.isElse() || node.isCase()){
        node = node.parent;
      }
      node.push(new Node(NodeTypes.End, match[1], node, false, node));
      node = node.parent;
    } else if((match = line.match(/^@([^ \t]*)(?:[,(]([^;)]*))?/))){ //functions
      //Functions don't really have an explicit end, They Just end When theres a new function
      if(node.isFunction()){
        node = node.parent;
      }
      if(node.type != NodeTypes.Root){
        console.log(node.parent);
        throw new Error(`Unexpected Nested Function`);
      }
      node = new Node(NodeTypes.Function, match[1], node, true, match[2]);
      node.parent.push(node);
      //} else if((match = line.match(NodeTypes.^\$([^; \t]*)))){ //labels
      //      node.push(new Node(NodeTypes.Label, match[1]));
    } else if(line.startsWith(';')){ //comment
      let comment = line;
      let empty = 0;
      while(i < lines.length){
        let line = lines[i].trimStart()
        if(line.startsWith(';')){
          //preserve empty lines between comments
          if(empty){
            comment += '\n'.repeat(empty);
            empty = 0;
          }
          comment += '\n' + lines[i].trimStart();
        } else if(line.length == 0){
          empty++;
        } else {
          break;
        }
        i++;
      }
      node.push(new Node(NodeTypes.Comment, comment, node));
    } else if((match = line.match(outputRE))){ //output
      //outputRE = /((?:[KWN]STR.*?=)|(?:PRINT[^ \t]*))[ \t]+(.*)/
      //I could try to match these in the initial regex, but that would be too complicated
      let matchTmp = match[1].match(/([KWN])STR|PRINT.*(.)/);
      if(matchTmp == null){
        throw new Error("Output line regexp match failure: "+ line);
      }
      let printType = "";
      if(matchTmp[1]){
        printType = matchTmp[1] + '+';
      } else {
        printType = matchTmp[2] ?? 'N';
      }
      let newline = "KLW".includes(printType[0]);
      if(match[2]){
        let content = unescapeUnicode(util.trimAscii(match[2]));
        // if(content.length > 1 && content != "「」"){
        //   node.content = true;
        // }
        let outputNode = new Node(NodeTypes.Output, content, node, false, printType);
        node.push(outputNode);
      } else if(newline){
        node.push(new Node(NodeTypes.Output, '', node, false, printType));
      }
    } else {
      node.push(new Node(NodeTypes.Code, line, node));
    }
  }
  //NOTE: SIF is really weird, it conditionally executes the next line, I thought
  //it wouldn't skip comments/blank lines, but apparently it does.
  return root;
}
export function extractLines(node: Node): Object {
  let lines: string[] = [];
  let cb = (n: Node) => {
    if(n.isOutput() && !(n.value == '\n' || n.value == '\\n')){
      lines.push(n.value);
    }
  }
  node.walk(cb);
  return Object.fromEntries(lines.map(x => [x, null]));
}
