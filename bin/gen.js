#!/usr/bin/env node


'use strict';


const fs = require('fs');
const commander = require('commander');
const Identicon = require('../Identicon.js');


commander
  .version('0.0.1')
  .usage('<string>')
  .option('-g, --svg', 'create SVG [default PNG]')
  .option('-e, --edge [500]', 'specify edge length', 500)
  .option('-o, --outfile <pathname>', 'store the output instead of stream it')
  .option('-s, --salt <string>', 'salt-modifier')
  .action(string => {
    const edge = commander.edge;
    const format = commander.svg? 'svg' : 'png';
    const salt = commander.salt;
    const outfile = commander.outfile;

    generate(string, edge, format, salt, outfile)
  })


commander.parse(process.argv)


function generate(str, edge, format, salt, outfile) {
  const identicon = new Identicon({
    edge, format, salt, outfile
  })

  const buffer = identicon.generate(str, false)

  if (outfile) {
    return writeOutfile(outfile, buffer);
  }

  console.log(buffer.toString())
}


function writeOutfile(outfile, buffer) {
  fs.writeFile(outfile, buffer, err => {
    if (err) {
      console.log(`Error writing to ${outfile}: ${err.name} ${err.message}`)
      process.exit(1);
    }

    process.exit(0);
  })
}