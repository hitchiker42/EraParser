This is a tool to help translate erb files (sorce files for eramaker/emuera).
It parses the erb files and extracts the output lines. It can also
take a file of translations and insert them.

Requirements: This is written in typescript but the generated
javascript files are included in the repository. Any relatively modern
verson of nodejs should be able to run this fine.

Usage: node js/main.js source.erb [translation.json] [dest.erb]

If given only a source file it will extract the output lines from it
and ouput them to stdout in json format. The original lines are the
keys and the values are left null, to be filled in by the tranlation.

If given a translation file it will parse the source file and use the
translation file to replace output lines. Then it will output the
result to either the given dest file or source_translated.erb.

The generated translated file should be functionaly equivlant to the
original file, with the obvious exception of the different output,
however this is still a very early version of this software so it may
not be perfect. One note is that any unused code in the original file
will be removed, this shouldn't effect anything.

This is the first version of this software and there are several
possible improvements/additions that could be made.
