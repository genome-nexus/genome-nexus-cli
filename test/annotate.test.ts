import { isValidGenomicLocation } from '../src/command/annotate/utils';

test('isValidGenomicLocation', () => {
    expect(isValidGenomicLocation({
        'chromosome':'3',
        'start':25,
        'end':30,
        'referenceAllele':'-',
        'variantAllele':'-'
    })).toBe(false);
});