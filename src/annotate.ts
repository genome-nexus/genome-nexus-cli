import lineByLine = require('n-readlines');
import { keyBy } from 'lodash';

import GenomeNexusAPI, { GenomicLocation, VariantAnnotation } from './api/generated/GenomeNexusAPI';

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

export async function annotateGenomicLocationGET(
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

export async function annotateGenomicLocationPOST(
    genomicLocations: GenomicLocation[],
    client = DEFAULT_GENOME_NEXUS_CLIENT
) {
    if (client.fetchVariantAnnotationByGenomicLocationPOST) {
        return await client.fetchVariantAnnotationByGenomicLocationPOST({
            genomicLocations: genomicLocations,
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

export function genomicLocationToKey(gl:GenomicLocation):string {
    return `${gl.chromosome},${gl.start},${gl.end},${gl.referenceAllele},${gl.variantAllele}`;
}

export function indexAnnotationsByGenomicLocation(annotations:VariantAnnotation[]) {
    return keyBy(annotations, function (annotation:VariantAnnotation) {
        if (annotation && annotation.annotation_summary) { 
            return genomicLocationToKey(annotation.annotation_summary.genomicLocation);
        }
    });
}

export async function annotateAndPrintChunk(chunk:annotateLine[], chunkSize:number) {
    // TODO: only annotate unique genomic locations
    let annotations = await annotateGenomicLocationPOST(chunk.map((ca => ca.genomicLocation)));
    let annotationsIndexed = indexAnnotationsByGenomicLocation(annotations);

    let i: number;
    for (i = 0; i < chunk.length; i++) {
        if (annotationsIndexed.hasOwnProperty(genomicLocationToKey(chunk[i].genomicLocation)) &&
            annotationsIndexed[genomicLocationToKey(chunk[i].genomicLocation)] &&
            annotationsIndexed[genomicLocationToKey(chunk[i].genomicLocation)].annotation_summary) {
            let summary = annotationsIndexed[genomicLocationToKey(chunk[i].genomicLocation)].annotation_summary.transcriptConsequenceSummary;
            console.log( `${chunk[i].line.trim()}\t${summary.hugoGeneSymbol}\t${summary.hgvspShort}\t${summary.hgvsc}\t${summary.exon}\t${summary.variantClassification}`);
        } else {
            console.log(`${chunk[i].line.trim()}\t\t\t\t\t`)
        }
    }

}

export type annotateLine = {
    line: string,
    genomicLocation: GenomicLocation
}

export async function annotateMAF(
    inputFile: string,
    chunkSize: number = 10,
    client = DEFAULT_GENOME_NEXUS_CLIENT) {
    const COLUMN_NAMES_MAF = 'Chromosome\tStart_Position\tEnd_Position\tReference_Allele\tTumor_Seq_Allele2'.split('\t');

    let chunkedAnnotations:annotateLine[] = [];
    let indices = {};
    let line;
    let rowCount = 0;

    const liner = new lineByLine(inputFile);

    while (line = liner.next()) {
        line = line.toString('ascii');

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
            chunkedAnnotations.push({line:line,genomicLocation})
            if (chunkedAnnotations.length >= chunkSize) {
                await annotateAndPrintChunk(chunkedAnnotations, chunkSize);
                chunkedAnnotations = [];
            }
        }
        rowCount += 1;
    }
    // annotate leftover mutations
    if (chunkedAnnotations.length >= 0) {
        await annotateAndPrintChunk(chunkedAnnotations, chunkSize);
    }
}