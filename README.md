**WARNING ⚠️: The [java based MAF annotator](https://github.com/genome-nexus/genome-nexus-annotation-pipeline) and associated [vcf2maf python conversion scripts](https://github.com/genome-nexus/annotation-tools/blob/master/vcf2maf.py) are more up to date, use this at your own risk. This was an attempt to restructure the cli interface but it is not actively maintained.**

# Command Line Interface for Genome Nexus

Genome Nexus is a web service: https://www.genomenexus.org. A comprehensive one-stop resource for fast, automated and high-throughput annotation and interpretation of genetic variants in cancer. Genome Nexus integrates information from a variety of existing resources, including databases that convert DNA changes to protein changes, predict the functional effects of protein mutations, and contain information about mutation frequencies, gene function, variant effects, and clinical actionability. For a list of all annotations see here: https://docs.genomenexus.org/annotation-sources. This command line client annotates VCF and MAF files using annotations provided by the Genome Nexus API. The command line client's internal logic is lean: it sends a HTTP request to the Genome Nexus REST API to retreive annotations. Most logic happens in the web service itself. The variants are sent without sample IDs, so the variants can't be related back to specific samples.

## Install 💻

### For users

Genome Nexus can be installed/run in several ways, choose which one works for you:

- If you have [npm](https://www.npmjs.com/get-npm) installed. You can run it directly with:
    ```
    npx genome-nexus-cli --help
    ```
    or install globally with:
    ```
    npm install -g genome-nexus-cli
    genome-nexus --help
    ```
- If you have [Docker](https://docs.docker.com/docker-for-windows/install/) installed:
    ```
    docker run -it --rm node:8.12.0  npx genome-nexus-cli --help
    ```
- If you have [conda](https://docs.conda.io/projects/conda/en/latest/user-guide/install/) installed:
    ```
    conda create -c conda-forge -n genome-nexus-env nodejs
    conda activate genome-nexus-env
    npm install -g genome-nexus-cli
    genome-nexus --help
    ```

If you use none of these and prefer another way of installing please file a request in the issue tracker: https://github.com/genome-nexus/genome-nexus-cli/issues.

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

Note that there is also a web interface to do this: https://www.cbioportal.org/mutation_mapper.


#### Include OncoKB annotations
To add [OncoKB](https://www.oncokb.org) annotations one should first [obtain a
license](https://www.oncokb.org/dataAccess). Once you have a token one can add oncokb annotations like this:

```bash
genome-nexus annotate maf --tokens {"oncokb":"xxx-xxx-xxxx"} test/data/minimal_example.in.txt > test/data/minimal_example.out.txt
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
- [ ] There are still many more annotation sources to add: https://docs.genomenexus.org/annotation-sources

## Test Status 👷‍♀️

| branch | master |
| --- | --- |
| status | [![CircleCI](https://circleci.com/gh/genome-nexus/genome-nexus-cli/tree/master.svg?style=svg)](https://circleci.com/gh/genome-nexus/genome-nexus-cli/tree/master) |
