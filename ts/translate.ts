import { Node, NodeTypes } from './node';
import { parseFile, extractLines } from './parse';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import * as path from 'node:path';
function generateDstFilename(srcFilename: string){
  let base = path.basename(srcFilename, '.erb');
  return base + '_translated.erb';
}
/*
  Given a json formatted file of translations translate the given source erb file.

  The translation file should contain a json object with the original japanese lines
  as keys and the translations as values.
*/
export function translateFile(srcFilename: string,
                              translationFilename: string,
                              dstFilename?: string){
  let ast = parseFile(srcFilename);
  let translations = JSON.parse(readFileSync(translationFilename).toString());
  let cb = (node: Node) => {
    if(node.isOutput()){
      node.value = translations[node.value] ?? node.value;
    }
  }
  ast.walk(cb);
  if(!dstFilename){
    dstFilename = generateDstFilename(srcFilename);
  }    
  writeFileSync(dstFilename, ast.toCode());
}
export function translateFileInPlace(srcFilename: string,
                                     translationFilename: string){
  let dstFilename = generateDstFilename(srcFilename);
  translateFile(srcFilename, translationFilename, dstFilename);
  renameSync(srcFilename, dstFilename);
}
  
