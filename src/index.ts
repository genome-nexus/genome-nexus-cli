#!/usr/bin/env node
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import program from 'commander';
import { convertVCFtoMAF } from './convert';

program
    .version('0.0.1')
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
    .action((inputFile, args) => {
        convertVCFtoMAF(inputFile);
    });

program.command('annotate', 'retrieve annotations');

program.parse(process.argv);
if (program.args.length === 0) {
    // display usage when no arguments given
    program.help();
}