#!/usr/bin/env node
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import program from 'commander';
import { convertVCFtoMAF } from './convert';
import { annotate, annotateMAF } from './annotate';

const withErrors = (command: (...args) => Promise<void>) => {
    return async (...args: any[]) => {
        try {
            await command(...args);
        } catch (e) {
            console.log(chalk.red(e.stack));
            process.exitCode = 1;
        }
    };
};

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

program
    .command('annotate')
    .description('retrieve annotations for a variant')
    .action(async (input, args) => {
        try {
            const annotation = await annotate(input);
            console.log(JSON.stringify(annotation, null, 4));
        } catch (e) {
            console.log(chalk.red(e.stack));
            process.exitCode = 1;
        }
    });

program
    .command('annotatemaf')
    .description('retrieve annotations for a maf file')
    .option('-c, --chunk-size <number>', 'how many variants to send in single POST request', 5)
    .option('--output-file-failed <string>', 'output failed records to this file')
    .option('--exclude-failed', 'exclude failed records from stdout')
    .action(async (input, args) => {
        try {
            const annotation = await annotateMAF(input, args.chunkSize, args.excludeFailed, args.outputFileFailed);
        } catch (e) {
            console.log(chalk.red(e.stack));
            process.exitCode = 1;
        }
    });

program.parse(process.argv);
if (program.args.length === 0) {
    // display usage when no arguments given
    program.help();
}
