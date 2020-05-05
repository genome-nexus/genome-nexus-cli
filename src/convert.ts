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
    // default VCF index of columns
    let column_nr = {
        CHROM: 0,
        POS: 1,
        REF: 3,
        ALT: 4,
    };

    console.log(
        'Chromosome\tStart_Position\tEnd_Position\tReference_Allele\tTumor_Seq_Allele2'
    );
    lineReader.eachLine(inputFile, function(line) {
        if (line.startsWith('#CHROM')) {
            // handle non default order of columns
            const fields = line.substring(1).split('\t');

            let i = 0;
            for (let field of fields) {
                if (Object.keys(column_nr).includes(field)) {
                    column_nr[field] = i;
                }
                i++;
            }
        } else if (!line.startsWith('#')) {
            const fields = line.split('\t');
            const MafRecord = convertVCFRecordToMAFRecord({
                CHROM: fields[column_nr['CHROM']],
                POS: parseInt(fields[column_nr['POS']]),
                REF: fields[column_nr['REF']],
                ALT: fields[column_nr['ALT']],
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
            End_Position: input.POS + (input.REF.length - 1),
            Reference_Allele: input.REF,
            Tumor_Seq_Allele2: input.ALT,
        };
    } else if (input.REF.length > input.ALT.length) {
        if (input.ALT.length !== 1) {
            // find longest common prefix and remove
            let longestCommonPrefix = '';
            let i = 0;
            for (let c of input.ALT) {
                if (c === input.REF[i]) {
                    longestCommonPrefix += c;
                    i++;
                } else {
                    break;
                }
            }

            const mafRef = input.REF.substring(longestCommonPrefix.length);
            const mafAlt = input.ALT.substring(longestCommonPrefix.length);
            const mafStartPos = input.POS + longestCommonPrefix.length;
            const mafEndPos = mafStartPos + mafRef.length - 1;
            return {
                Chromosome: input.CHROM,
                Start_Position: mafStartPos,
                End_Position: mafEndPos,
                Reference_Allele: mafRef,
                Tumor_Seq_Allele2: mafAlt,
            };
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
