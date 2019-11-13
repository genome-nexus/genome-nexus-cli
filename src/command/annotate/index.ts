import chalk from 'chalk';
import program from 'commander';

import { annotate, annotateMAF, COLUMN_NAMES_MAF, initGenomeNexusClient, DEFAULT_GENOME_NEXUS_URL } from './utils';

program
    .command('variant')
    .description(
        'annotate a single variant in hgvsg format e.g. 17:g.41242962_41242963insGA'
    )
    .option(
        '--api-url <string>',
        'URL of genome nexus API to use',
        DEFAULT_GENOME_NEXUS_URL
    )
    .action(async (input, args) => {
        try {
            const annotation = await annotate(input, initGenomeNexusClient(args.apiUrl));
            console.log(JSON.stringify(annotation, null, 4));
        } catch (e) {
            console.log(chalk.red(e.stack));
            process.exitCode = 1;
        }
    });

program
    .command('maf')
    .description(
        `retrieve annotations for a maf file, required columns: ${COLUMN_NAMES_MAF}`
    )
    .option(
        '--api-url <string>',
        'URL of genome nexus API to use',
        DEFAULT_GENOME_NEXUS_URL
    )
    .option(
        '-c, --chunk-size <number>',
        'how many variants to send in single POST request',
        100
    )
    .option(
        '--output-file-failed <string>',
        'output failed records to this file'
    )
    .option('--exclude-failed', 'exclude failed records from stdout')
    .action(async (input, args) => {
        try {
            const annotation = await annotateMAF(
                input,
                args.chunkSize,
                args.excludeFailed,
                args.outputFileFailed,
                initGenomeNexusClient(args.apiUrl)
            );
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
