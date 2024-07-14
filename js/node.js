"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = exports.stringToNodeType = exports.NodeTypes = void 0;
const node_assert_1 = __importDefault(require("node:assert"));
//IDEA: We don't really need an explict End node, we can infer it by the block ending
//and get the type based on the type of the block.
exports.NodeTypes = {
    Root: 0, //Not really a type, used for the root node only
    If: 1, //IF statement, value = condition
    ElseIf: 2, //ELSEIF statement, value = condition
    Else: 3, //ELSE statment, value = undefined
    Function: 4, //Function definition, value = name, extra = params
    Select: 5, //SELECTCASE statement, value = expression to branch on
    Case: 6, //CASE statement, value = the case value
    CaseElse: 7, //CASEELSE statement, default case for a select
    For: 8, //FOR loop, value = iteration params, basically unused
    End: 9, //End of a block statment, value = literal code (i.e, ENDIF, ENDSELECT, etc...)
    Code: 10, //default, value = the literal line of code from the file
    Comment: 11, //comment, multiline comments are combined into one node
    Output: 12, //Output, Either a PRINT call or appending to an array to be printed
};
function nodeTypeName(type) {
    //Names that might be used in converting to code are uppercase for simplicity.
    return ['Root', 'IF', 'ELSEIF', 'ELSE', 'Function', 'SELECTCASE', 'CASE',
        'CASEELSE', 'FOR', 'End', 'Code', 'Comment', 'Output'][type];
}
function stringToNodeType(str) {
    switch (str) {
        case 'IF': return exports.NodeTypes.If;
        case 'ELSEIF': return exports.NodeTypes.ElseIf;
        case 'ELSE': return exports.NodeTypes.Else;
        case 'SELECT':
        case 'SELECTCASE':
            return exports.NodeTypes.Select;
        case 'CASE': return exports.NodeTypes.Case;
        case 'CASEELSE': return exports.NodeTypes.CaseElse;
        case 'FOR': return exports.NodeTypes.For;
        default:
            throw new Error(`Unrecognized node type ${str}`);
    }
}
exports.stringToNodeType = stringToNodeType;
class Node {
    type;
    value = "";
    parent; //Root node has no parent, but it's more convient to prentend it does.
    body;
    //True if this node is code or is a block which contains code.
    content = false;
    //Field for values exclusive to a specifc node type, should be accessed using
    //a getter for the actual field you want.
    extra;
    constructor(type, value, parent, hasBody = false, extra) {
        this.type = type;
        this.value = value;
        this.parent = parent ?? this;
        this.body = hasBody ? [] : undefined;
        this.extra = extra;
    }
    typeName() {
        return nodeTypeName(this.type);
    }
    //Some convience functions to test node type.
    isLeaf() {
        return this.body == null;
    }
    isBlock() {
        return this.body != null;
    }
    isFunction() {
        return this.type == exports.NodeTypes.Function;
    }
    isElse() {
        return this.type == exports.NodeTypes.ElseIf || this.type == exports.NodeTypes.Else;
    }
    isCase() {
        return this.type == exports.NodeTypes.Case || this.type == exports.NodeTypes.CaseElse;
    }
    isEnd() {
        return this.type == exports.NodeTypes.End;
    }
    isOutput() {
        return this.type == exports.NodeTypes.Output;
    }
    toString() {
        if (this.isLeaf()) {
            return this.value;
        }
        else if (this.isFunction()) {
            return '@' + this.value + (this.args ? '(' + this.args + ')' : '');
        }
        else {
            return this.typeName() + (this.value ? ' ' + this.value : '');
        }
    }
    //getters for the extra field
    get start() {
        (0, node_assert_1.default)(this.type == exports.NodeTypes.End);
        return this.extra;
    }
    //printType is used to encode the original form of an output line.
    //It's one of K,W,N,L possibly followed by a '+'
    //With no '+' it encodes PRINTFORMX output, where X is the letter
    //With a '+' it encodes XSTR:(K++) = output
    get printType() {
        (0, node_assert_1.default)(this.type == exports.NodeTypes.Output);
        return this.extra;
    }
    get args() {
        (0, node_assert_1.default)(this.type == exports.NodeTypes.Function);
        return (this.extra ? this.extra : undefined);
    }
    //Print the ast prefinding each line with the node type, mainly used for debugging
    print(depth = 0) {
        if (this.type == exports.NodeTypes.Output) {
            console.log(`Output(${this.printType}${depth}): ${this.value}`);
            return;
        }
        console.log(nodeTypeName(this.type) + `(${depth})` + ':'
            + (this.value ? this.value : nodeTypeName(this.type)));
        if (this.isBlock()) {
            this.body.forEach(x => x.print(depth + 1));
        }
    }
    //Append this node to the body of its parent.
    addToParent() {
        this.parent.push(this);
    }
    //Append val to the body of this node.
    push(val) {
        if (this.body == null) {
            throw new Error("Attempting to append to a leaf node");
        }
        this.body.push(val);
    }
    isContent() {
        return this.type == exports.NodeTypes.Code || this.type == exports.NodeTypes.Output;
    }
    /*
      Mark nodes which actually contain code, most files are copies of a template
      so they have a lot of empty if/else blocks, this lets us find and remove them.
  
      TODO: We could try and identify commented out blocks of code and remove them too.
    */
    markContent() {
        if (this.isBlock()) {
            for (let node of this.body) {
                if (node.markContent()) {
                    this.content = true;
                }
                if (node.type == exports.NodeTypes.End) {
                    node.content = this.content;
                }
            }
        }
        else {
            this.content = this.isContent();
        }
        return this.content;
    }
    //Call cb for each node of the tree
    walk(cb, depth = 0) {
        if (this.isBlock()) {
            //To simplify things structurally else(if) nodes are treated as children
            //of their respective if nodes, but they're really siblings so we need
            //to strip a layer of depth from them.
            if (this.isElse()) {
                depth--;
            }
            cb(this, depth);
            this.body.forEach(x => x.walk(cb, depth + 1));
        }
        else {
            cb(this, depth);
        }
    }
    //Convert the ast back into text.
    toCode() {
        if (!this.content) {
            this.markContent();
        }
        if (this.type == exports.NodeTypes.Root) { //strip the root node first
            return this.body.map(x => x.toCodeInternal()).join('\n');
        }
        else {
            return this.toCodeInternal();
        }
    }
    toCodeInternal(depth = 0) {
        if (this.type == exports.NodeTypes.ElseIf || this.type == exports.NodeTypes.Else || this.type == exports.NodeTypes.End) {
            depth--;
        }
        //I prefer spaces but most erb files seem to be indented with tabs
        let indent = '\t'.repeat(depth);
        let val;
        switch (this.type) {
            case exports.NodeTypes.Output: {
                let letter = this.printType[0];
                if (this.printType[1] == '+') {
                    return indent + letter + 'STR:(K++) = ' + this.value;
                }
                else {
                    return indent + 'PRINTFORM' + letter + ' ' + this.value;
                }
            }
            //TODO: Ideally we should strip a level of indentation if a comment
            //is the last node of a block (since that usually means it's refering to the next block)
            case exports.NodeTypes.Comment:
                {
                    //For large block comments (>5 lines) don't indent them
                    let lines = this.value.split('\n').length;
                    if (lines > 5) {
                        return this.toString();
                    }
                    else {
                        return indent + this.toString();
                    }
                }
                ;
            case exports.NodeTypes.Function:
                //functions can't be nested so indent is always 0
                val = '@' + this.value + (this.extra ? '(' + this.extra + ')' : '');
                break;
            default:
                val = indent + this.toString();
        }
        if (this.isBlock()) {
            if (this.content) {
                if (this.type != exports.NodeTypes.Function) {
                    depth++;
                }
                let body = this.body.map(x => x.toCodeInternal(depth));
                return val + '\n' + body.join('\n');
            }
            else {
                return '';
            }
        }
        else {
            return val;
        }
    }
}
exports.Node = Node;
