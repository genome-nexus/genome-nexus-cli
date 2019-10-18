import lineReader from 'line-reader';

export function convertVCFtoMAF(inputFile: string) {
    console.log(
        'Chromosome\tStart_Position\tEnd_Position\tReference_Allele\tTumor_Seq_Allele1'
    );
    lineReader.eachLine(inputFile, function(line) {
        if (!line.startsWith('#')) {
            const fields = line.split('\t');
            console.log(
                [fields[0], fields[1], fields[3], fields[4]].join('\t')
            );
        }
    });
}
