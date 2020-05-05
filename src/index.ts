#!/usr/bin/env node
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import program from 'commander';
import { convertVCFtoMAF } from './convert';

// this works because package.json gets copied to lib/
// @ts-ignore
import { version } from './package.json';

program
    .version(version)
    .description(
        chalk.cyan(
            figlet.textSync('Genome Nexus', { horizontalLayout: 'full' })
        ) +
            '\n' +
            chalk.yellowBright(
                '                Annotation and interpretation of genetic variants in cancer\n'
            )
    );

program
    .command('convert')
    .description('convert between different mutation formats (e.g. VCF to MAF)')
    .action((input, args) => {
        convertVCFtoMAF(args[0]);
    });

program.command('annotate', 'retrieve annotations');

program.parse(process.argv);
if (program.args.length === 0) {
    // display usage when no arguments given
    program.help();
}
