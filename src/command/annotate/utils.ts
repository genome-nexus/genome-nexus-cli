import lineByLine from 'n-readlines';
import { keyBy } from 'lodash';
import fs from 'fs';
import os from 'os';

import GenomeNexusAPI, {
    GenomicLocation,
    VariantAnnotation,
} from './../../api/generated/GenomeNexusAPI';

export const DEFAULT_GENOME_NEXUS_URL = 'https://www.genomenexus.org/';
export const COLUMN_NAMES_MAF = 'Chromosome\tStart_Position\tEnd_Position\tReference_Allele\tTumor_Seq_Allele2'.split(
    '\t'
);

export const ERROR = {
    API_ERROR: 'API_ERROR',
};

export function isValidGenomicLocation(
    genomicLocation: GenomicLocation
): boolean {
    return (
        genomicLocation.chromosome &&
        genomicLocation.referenceAllele &&
        genomicLocation.variantAllele &&
        genomicLocation.start &&
        genomicLocation.end &&
        ((genomicLocation.referenceAllele === '-' &&
            /[ACGT]+/.test(genomicLocation.variantAllele)) ||
            (genomicLocation.variantAllele === '-' &&
                /[ACGT]+/.test(genomicLocation.referenceAllele)) ||
            (/[ACGT]+/.test(genomicLocation.referenceAllele) &&
                /[ACGT]+/.test(genomicLocation.variantAllele)))
    );
}

export function initGenomeNexusClient(genomeNexusUrl?: string) {
    return new GenomeNexusAPI(genomeNexusUrl || DEFAULT_GENOME_NEXUS_URL);
}

export async function annotate(hgvs: string, client: GenomeNexusAPI) {
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
    client: GenomeNexusAPI
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
    client: GenomeNexusAPI
) {
    if (client.fetchVariantAnnotationByGenomicLocationPOST) {
        return await client.fetchVariantAnnotationByGenomicLocationPOST({
            genomicLocations: genomicLocations,
            isoformOverrideSource: 'mskcc',
            fields: ['annotation_summary'],
        });
    } else {
        return undefined;
    }
}

export function genomicLocationToKey(gl: GenomicLocation): string {
    return `${gl.chromosome},${gl.start},${gl.end},${gl.referenceAllele},${gl.variantAllele}`;
}

export function indexAnnotationsByGenomicLocation(
    annotations: VariantAnnotation[]
) {
    return keyBy(annotations, function(annotation: VariantAnnotation) {
        if (annotation && annotation.annotation_summary) {
            return genomicLocationToKey(
                annotation.annotation_summary.genomicLocation
            );
        }
    });
}

export async function annotateAndPrintChunk(
    chunk: annotateLine[],
    chunkSize: number,
    excludeFailed: boolean,
    outputFileFailed: string,
    client: GenomeNexusAPI
) {
    try {
        // TODO: only annotate unique genomic locations
        let annotations = await annotateGenomicLocationPOST(
            chunk
                .filter(ca => isValidGenomicLocation(ca.genomicLocation))
                .map(ca => ca.genomicLocation),
            client
        );
        let annotationsIndexed = indexAnnotationsByGenomicLocation(annotations);

        let i: number;
        for (i = 0; i < chunk.length; i++) {
            if (
                isValidGenomicLocation(chunk[i].genomicLocation) &&
                annotationsIndexed.hasOwnProperty(
                    genomicLocationToKey(chunk[i].genomicLocation)
                ) &&
                annotationsIndexed[
                    genomicLocationToKey(chunk[i].genomicLocation)
                ] &&
                annotationsIndexed[
                    genomicLocationToKey(chunk[i].genomicLocation)
                ].annotation_summary &&
                annotationsIndexed[
                    genomicLocationToKey(chunk[i].genomicLocation)
                ].annotation_summary.transcriptConsequenceSummary
            ) {
                let summary =
                    annotationsIndexed[
                        genomicLocationToKey(chunk[i].genomicLocation)
                    ].annotation_summary.transcriptConsequenceSummary;
                console.log(
                    `${chunk[i].line.trim()}\t${summary.hugoGeneSymbol}\t${
                        summary.hgvspShort
                    }\t${summary.hgvsc}\t${summary.exon}\t${
                        summary.variantClassification
                    }`
                );
            } else {
                console.log(`${chunk[i].line.trim()}\t\t\t\t\t`);
            }
        }
    } catch {
        if (!excludeFailed) {
            console.log(
                chunk.map(ca => `${ca.line.trim()}\t\t\t\t\t`).join(os.EOL)
            );
        }
        if (outputFileFailed) {
            fs.appendFile(
                outputFileFailed,
                chunk
                    .map(ca => `${ca.line.trim()}\t\t\t\t\t${ERROR.API_ERROR}`)
                    .join(os.EOL) + os.EOL,
                function(err) {
                    if (err) {
                        console.error(
                            `Can't write to outputFileFailed: ${outputFileFailed}`
                        );
                    }
                }
            );
        }
    }
}

export type annotateLine = {
    line: string;
    genomicLocation: GenomicLocation;
};

export async function annotateMAF(
    inputFile: string,
    chunkSize: number = 10,
    excludeFailed: boolean,
    outputFileFailed: string,
    client: GenomeNexusAPI
) {
    let chunkedAnnotations: annotateLine[] = [];
    let indices = {};
    let line;
    let rowCount = 0;

    const liner = new lineByLine(inputFile);

    while ((line = liner.next())) {
        line = line.toString('ascii');

        let columns = line.split('\t');

        if (rowCount === 0) {
            for (let columnName of COLUMN_NAMES_MAF) {
                let index: number = columns.indexOf(columnName);
                if (index !== -1) {
                    indices[columnName] = index;
                } else {
                    throw new Error(`Missing column in header: ${columnName}`);
                }
            }
            const header = `${line.trim()}\thugoGeneSymbol\thgvspShort\thgvsc\texon\tvariantClassification`;
            console.log(header);
            if (outputFileFailed) {
                fs.writeFileSync(
                    outputFileFailed,
                    `${header}\tGENOME_NEXUS_ERROR_CODE${os.EOL}`
                );
            }
        } else {
            let genomicLocation = {
                chromosome: columns[indices['Chromosome']]
                    .replace('23', 'X')
                    .replace('24', 'Y'),
                start: parseInt(columns[indices['Start_Position']]),
                end: parseInt(columns[indices['End_Position']]),
                referenceAllele: columns[indices['Reference_Allele']],
                variantAllele: columns[indices['Tumor_Seq_Allele2']],
            };
            chunkedAnnotations.push({ line: line, genomicLocation });
            if (chunkedAnnotations.length >= chunkSize) {
                await annotateAndPrintChunk(
                    chunkedAnnotations,
                    chunkSize,
                    excludeFailed,
                    outputFileFailed,
                    client
                );
                chunkedAnnotations = [];
            }
        }
        rowCount += 1;
    }
    // annotate leftover mutations
    if (chunkedAnnotations.length >= 0) {
        await annotateAndPrintChunk(
            chunkedAnnotations,
            chunkSize,
            excludeFailed,
            outputFileFailed,
            client
        );
    }
}
