import GenomeNexusAPI from './api/generated/GenomeNexusAPI';

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
            isoformOverrideSource: 'uniprot',
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