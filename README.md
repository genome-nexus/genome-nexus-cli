# 💻 Command Line Interface for Genome Nexus 🧬

🚧 Under construction 🚧

## Install 💻

### For users

TODO

### For developers

```bash
git clone https://github.com/genome-nexus/genome-nexus-cli
yarn
yarn build
yarn link
```

## Usage examples 🧬

Check the help docs:

```bash
genome-nexus --help
```

### Convert VCF to MAF ready for annotation

```bash
genome-nexus convert variants.vcf
```

### Annotate maf file

Given input MAF file like: [test/data/minimal_example.in.txt](./test/data/minimal_example.in.txt). Get annotated output MAF like: [test/data/minimal_example.out.txt](./test/data/minimal_example.out.txt)

```bash
genome-nexus annotate maf test/data/minimal_example.in.txt > test/data/minimal_example.out.txt
```

### Get JSON output for a single variant

```bash
genome-nexus annotate variant 17:g.41242962_41242963insGA
```

Gives raw JSON output: [https://www.genomenexus.org/annotation/17:g.41242962_41242963insGA](https://www.genomenexus.org/annotation/17:g.41242962_41242963insGA)


## TODO 🔧

- [ ] Output ignored variants instead of only failed variants. E.g. when genomic location is not valid
- [ ] Add tests for
  - [ ] single variant anntotation
  - [ ] maf annotation
  - [ ] vcf conversion
- [ ] User installation documentation

## Test Status 👷‍♀️

| branch | master |
| --- | --- |
| status | [![CircleCI](https://circleci.com/gh/genome-nexus/genome-nexus-cli/tree/master.svg?style=svg)](https://circleci.com/gh/genome-nexus/genome-nexus-cli/tree/master) |
