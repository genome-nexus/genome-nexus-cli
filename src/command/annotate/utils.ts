import lineByLine from 'n-readlines';
import { keyBy, groupBy, mapValues } from 'lodash';
import fs from 'fs';
import os from 'os';

import GenomeNexusAPI, {
    GenomicLocation,
    VariantAnnotation,
    IndicatorQueryResp,
    IndicatorQueryTreatment,
} from './../../api/generated/GenomeNexusAPI';

//export const DEFAULT_GENOME_NEXUS_URL = 'https://www.genomenexus.org/';
export const DEFAULT_GENOME_NEXUS_URL = 'http://localhost:38080/';

export const COLUMN_NAMES_MAF = 'Chromosome\tStart_Position\tEnd_Position\tReference_Allele\tTumor_Seq_Allele2'.split(
    '\t'
);

export const ERROR = {
    API_ERROR: 'API_ERROR',
};
export const ONCOKB_LEVELS = [
    'LEVEL_1',
    'LEVEL_2',
    'LEVEL_3A',
    'LEVEL_3B',
    'LEVEL_4',
    'LEVEL_R1',
    'LEVEL_R2',
    'LEVEL_R3',
];
export const ANNOTATION_SUMMARY_HEADER = `\thugoGeneSymbol\thgvspShort\thgvsc\texon\tvariantClassification`;
export const ONCOKB_HEADER = `\tmutationEffect\toncogenic\t${ONCOKB_LEVELS.join('\t')}\thighestSensitiveLevel\thighestResistanceLevel`;


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

export async function annotate(
    hgvs: string,
    client: GenomeNexusAPI,
    tokens: string
) {
    if (client.fetchVariantAnnotationGET) {
        return await client.fetchVariantAnnotationGET({
            variant: hgvs,
            isoformOverrideSource: 'mskcc',
            token: tokens,
            fields: [
                'annotation_summary',
                'mutation_assessor',
                'my_variant_info',
                'oncokb',
            ],
        });
    } else {
        return undefined;
    }
}

export async function annotateGenomicLocationGET(
    genomicLocation: GenomicLocation,
    client: GenomeNexusAPI,
    tokens: string
) {
    if (client.fetchVariantAnnotationByGenomicLocationGET) {
        const genomicLocationString = `${genomicLocation.chromosome},${genomicLocation.start},${genomicLocation.end},${genomicLocation.referenceAllele},${genomicLocation.variantAllele}`;
        return await client.fetchVariantAnnotationByGenomicLocationGET({
            genomicLocation: genomicLocationString,
            isoformOverrideSource: 'mskcc',
            token: tokens,
            fields: [
                'annotation_summary',
                'mutation_assessor',
                'my_variant_info',
                'oncokb',
            ],
        });
    } else {
        return undefined;
    }
}

export async function annotateGenomicLocationPOST(
    genomicLocations: GenomicLocation[],
    client: GenomeNexusAPI,
    tokens: string
) {
    if (client.fetchVariantAnnotationByGenomicLocationPOST) {
        return await client.fetchVariantAnnotationByGenomicLocationPOST({
            genomicLocations: genomicLocations,
            isoformOverrideSource: 'mskcc',
            token: tokens,
            fields: ['annotation_summary', 'oncokb'],
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
    tokens: string,
    client: GenomeNexusAPI
) {
    // the number of columns added to the output file compare to input
    const addedFieldsHeaderLength = (`${ANNOTATION_SUMMARY_HEADER}${hasOncokbToken(tokens) && ONCOKB_HEADER}`.match(/\t/g) || []).length;
    try {
        // TODO: only annotate unique genomic locations
        let annotations = await annotateGenomicLocationPOST(
            chunk
                .filter(ca => isValidGenomicLocation(ca.genomicLocation))
                .map(ca => ca.genomicLocation),
            client,
            tokens
        );
        let annotationsIndexed = indexAnnotationsByGenomicLocation(annotations);

        let i: number;
        for (i = 0; i < chunk.length; i++) {
            let content = "";
            // check if have genome nexus response
            if (isValidGenomicLocation(chunk[i].genomicLocation) && annotationsIndexed.hasOwnProperty(genomicLocationToKey(chunk[i].genomicLocation)) && annotationsIndexed[genomicLocationToKey(chunk[i].genomicLocation)]) {
                // annotation_summary
                if (annotationsIndexed[genomicLocationToKey(chunk[i].genomicLocation)].annotation_summary && annotationsIndexed[genomicLocationToKey(chunk[i].genomicLocation)].annotation_summary.transcriptConsequenceSummary) {
                    let summary =
                    annotationsIndexed[
                        genomicLocationToKey(chunk[i].genomicLocation)
                    ].annotation_summary.transcriptConsequenceSummary;
                    content = content + `${chunk[i].line.trim()}\t${summary.hugoGeneSymbol}\t${
                            summary.hgvspShort
                        }\t${summary.hgvsc}\t${summary.exon}\t${
                            summary.variantClassification
                        }`;
                }
                else {
                    content = content + `${chunk[i].line.trim()}${countTab((ANNOTATION_SUMMARY_HEADER.match(/\t/g) || []).length)}`;
                }

                // oncokb
                // only add oncokb annotation columns if the oncokb token is provided
                if (hasOncokbToken(tokens) && annotationsIndexed[genomicLocationToKey(chunk[i].genomicLocation)].oncokb && annotationsIndexed[genomicLocationToKey(chunk[i].genomicLocation)].oncokb.annotation) {
                    let oncokb: IndicatorQueryResp =
                    annotationsIndexed[
                        genomicLocationToKey(chunk[i].genomicLocation)
                    ].oncokb.annotation;
                    // group drugs by level
                    const groupedDrugsByLevel = groupDrugsByLevel(oncokb);
                    let drugs = "";
                    // for each level, show combined drug names
                    ONCOKB_LEVELS.forEach(level => {
                        drugs = drugs + (groupedDrugsByLevel[level] ? groupedDrugsByLevel[level] : "") + `\t`;
                    });

                    content = content +
                    `\t${oncokb.mutationEffect ? oncokb.mutationEffect.knownEffect : ""}\t${
                        oncokb.oncogenic}\t${drugs}${oncokb.highestSensitiveLevel}\t${oncokb.highestResistanceLevel}`;
                }
                else {
                    content = content + (hasOncokbToken(tokens) && countTab((ONCOKB_HEADER.match(/\t/g) || []).length));
                }
            }
            else {
                // if no genome nexus response available, print genomic location and tabs(length = ANNOTATION_SUMMARY_HEADER + optional fields)
                content = `${chunk[i].line.trim()}${countTab(addedFieldsHeaderLength)}`;
            }

            // print
            console.log(content);
        }
    } catch {
        if (!excludeFailed) {
            console.log(
                chunk.map(ca => `${ca.line.trim()}${countTab(addedFieldsHeaderLength)}`).join(os.EOL)
            );
        }
        if (outputFileFailed) {
            fs.appendFile(
                outputFileFailed,
                chunk
                    .map(ca => `${ca.line.trim()}${countTab(addedFieldsHeaderLength)}${ERROR.API_ERROR}`)
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

export function countTab(length: number) {
    // print tabs
    let tabs = "";
    if (length > 0) {
        for (let i = 0; i < length; i++) {
            tabs += `\t`;
        }
    }
    return tabs;
}

export function hasOncokbToken(tokens: string | undefined) {
    if (tokens && tokens.includes("oncokb")) {
        return true;
    }
    else {
        return false;
    }
}

export function groupDrugsByLevel(oncokbAnnotation: IndicatorQueryResp) {
    let groupedDrugsByLevel: {[level: string]: string} = {};
    if (oncokbAnnotation.treatments.length > 0) {
        // group treatments by level
        let groupedTreatmentsByLevel = groupBy(
            oncokbAnnotation.treatments,
            treatment => treatment.level
        );
        // group drugs by level
        // for each level, different treatments are separate by ',', drugs in one treatment is combined with '+'
        groupedDrugsByLevel = mapValues(groupedTreatmentsByLevel, (treatments: IndicatorQueryTreatment[]) => {
            return treatments.map((treatment: IndicatorQueryTreatment) => {
                return treatment.drugs.map((drug) => drug.drugName).join('+');
            }).join(',');
        })
    }
    return groupedDrugsByLevel;
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
    tokens: string,
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
        let header = '';
        if (rowCount === 0) {
            for (let columnName of COLUMN_NAMES_MAF) {
                let index: number = columns.indexOf(columnName);
                if (index !== -1) {
                    indices[columnName] = index;
                } else {
                    throw new Error(`Missing column in header: ${columnName}`);
                }
            }
            // print header
            // default headers: genomic location, annotation_summary fields
            // optional headers: OncoKB will be added if provide OncoKB token
            // TODO add customizable columns header
            if (hasOncokbToken(tokens)) {
                header = `${line.trim()}${ANNOTATION_SUMMARY_HEADER}${ONCOKB_HEADER}`;
            }
            else {
                header = `${line.trim()}${ANNOTATION_SUMMARY_HEADER}`;
            }
            console.log(header);
            if (outputFileFailed) {
                fs.writeFileSync(
                    outputFileFailed,
                    `${line.trim()}${ANNOTATION_SUMMARY_HEADER}\tGENOME_NEXUS_ERROR_CODE${os.EOL}`
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
                    tokens,
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
            tokens,
            client
        );
    }
}
