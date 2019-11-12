import lineReader from 'line-reader';

export type VCFRecord = {
    CHROM: string;
    POS: number;
    REF: string;
    ALT: string;
};

export type MAFRecord = {
    Chromosome: string;
    Start_Position: number;
    End_Position: number;
    Reference_Allele: string;
    Tumor_Seq_Allele2: string;
};

export function convertVCFtoMAF(inputFile: string) {
    console.log(
        'Chromosome\tStart_Position\tEnd_Position\tReference_Allele\tTumor_Seq_Allele2'
    );
    lineReader.eachLine(inputFile, function(line) {
        if (!line.startsWith('#')) {
            const fields = line.split('\t');
            const MafRecord = convertVCFRecordToMAFRecord({
                CHROM: fields[0],
                POS: parseInt(fields[1]),
                REF: fields[3],
                ALT: fields[4],
            });
            console.log(
                `${MafRecord.Chromosome}\t${MafRecord.Start_Position}\t${MafRecord.End_Position}\t${MafRecord.Reference_Allele}\t${MafRecord.Tumor_Seq_Allele2}`
            );
        }
    });
}

export function convertVCFRecordToMAFRecord(input: VCFRecord): MAFRecord {
    if (input.REF.length === input.ALT.length) {
        return {
            Chromosome: input.CHROM,
            Start_Position: input.POS,
            End_Position: input.POS,
            Reference_Allele: input.REF,
            Tumor_Seq_Allele2: input.ALT,
        };
    } else if (input.REF.length > input.ALT.length) {
        if (input.ALT.length !== 1) {
            throw new Error(
                `VCF Record parsing error: unexpected ALT length\n${input}`
            );
        } else if (input.REF[0] !== input.ALT) {
            throw new Error(
                `VCF Record parsing error: unexpected REF/ALT combo\n${input}`
            );
        } else {
            return {
                Chromosome: input.CHROM,
                Start_Position: input.POS,
                End_Position: input.POS + input.REF.length - 2,
                Reference_Allele: input.REF.slice(1),
                Tumor_Seq_Allele2: '-',
            };
        }
    } else if (input.REF < input.ALT) {
        if (input.REF.length !== 1) {
            throw new Error(
                `VCF Record parsing error: unexpected REF length\n${input}`
            );
        } else if (input.ALT[0] !== input.REF) {
            throw new Error(
                `VCF Record parsing error: unexpected REF/ALT combo\n${input}`
            );
        } else {
            return {
                Chromosome: input.CHROM,
                Start_Position: input.POS,
                End_Position: input.POS + 1,
                Reference_Allele: '-',
                Tumor_Seq_Allele2: input.ALT.slice(1),
            };
        }
    }
}
