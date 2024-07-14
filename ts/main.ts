import { parseFile, extractLines } from './parse';
import { translateFile } from './translate'
import process from 'node:process';
function main(){
  let args = process.argv.slice(2);
  if(args.length < 1 || args.length > 3){
    console.log("Usage: ${process.argv[0]} ${process.argv[1]} source [translation] [dest]");
  }
  let src = args[0];
  if(args.length == 1){
    let ast = parseFile(src);
    let lines = extractLines(ast);
    console.log(JSON.stringify(lines));
  } else {
    let trFile = args[1];
    let dst = args[2];
    translateFile(src, trFile, dst);    
  }    
  //ast.print();
  //console.log(ast.toCode());  
}
main();
