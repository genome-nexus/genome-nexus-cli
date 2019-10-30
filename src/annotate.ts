import lineReader from 'line-reader';

import GenomeNexusAPI, { GenomicLocation } from './api/generated/GenomeNexusAPI';

export const DEFAULT_GENOME_NEXUS_URL = 'https://www.genomenexus.org/';
const DEFAULT_GENOME_NEXUS_CLIENT = initGenomeNexusClient();

export function initGenomeNexusClient(genomeNexusUrl?: string) {
    return new GenomeNexusAPI(genomeNexusUrl || DEFAULT_GENOME_NEXUS_URL);
}

export async function annotate(
    hgvs: string,
    client = DEFAULT_GENOME_NEXUS_CLIENT
) {
    if (client.fetchVariantAnnotationGET) {
        return await client.fetchVariantAnnotationGET({
            variant: hgvs,
            isoformOverrideSource: 'mskcc',
            fields: [
                'annotation_summary',
                'mutation_assessor',
                'my_variant_info',
            ],
        });
    } else {
        return undefined;
    }
}

export async function annotateGenomicLocation(
    genomicLocation: GenomicLocation,
    client = DEFAULT_GENOME_NEXUS_CLIENT
) {
    if (client.fetchVariantAnnotationByGenomicLocationGET) {
        const genomicLocationString = `${genomicLocation.chromosome},${genomicLocation.start},${genomicLocation.end},${genomicLocation.referenceAllele},${genomicLocation.variantAllele}`;
        return await client.fetchVariantAnnotationByGenomicLocationGET({
            genomicLocation: genomicLocationString,
            isoformOverrideSource: 'mskcc',
            fields: [
                'annotation_summary',
                'mutation_assessor',
                'my_variant_info',
            ],
        });
    } else {
        return undefined;
    }
}

export async function annotateMAF(
    inputFile: string,
    chunkSize: number = 10,
    client = DEFAULT_GENOME_NEXUS_CLIENT) {
    const COLUMN_NAMES_MAF = 'Chromosome\tStart_Position\tEnd_Position\tReference_Allele\tTumor_Seq_Allele2'.split('\t');

    let indices = {};
    let rowCount = 0;
    lineReader.eachLine(inputFile, async function(line) {
        let columns = line.split("\t");

        if (rowCount === 0) {
            for (let columnName of COLUMN_NAMES_MAF) {
                let index:number = columns.indexOf(columnName);
                if (index !== -1) {
                    indices[columnName] = index;
                } else {
                    throw new Error(`Missing column in header: ${columnName}`);
                }
            }
            console.log(`${line.trim()}\thugoGeneSymbol\thgvspShort\thgvsc\texon\tvariantClassification`);
        } else {
            let genomicLocation = {
                'chromosome':columns[indices['Chromosome']],
                'start':parseInt(columns[indices['Start_Position']]),
                'end':parseInt(columns[indices['End_Position']]),
                'referenceAllele':columns[indices['Reference_Allele']],
                'variantAllele':columns[indices['Tumor_Seq_Allele2']],
            };
            let annotation = await annotateGenomicLocation(genomicLocation);
            if (annotation) {
                let summary = annotation.annotation_summary.transcriptConsequenceSummary;
                console.log( `${line.trim()}\t${summary.hugoGeneSymbol}\t${summary.hgvspShort}\t${summary.hgvsc}\t${summary.exon}\t${summary.variantClassification}`);
            } else {
                console.log(`${line.trim()}\t\t\t\t\t`)
            }
        }
        rowCount +=1;
    });
}