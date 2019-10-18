# Command Line Interface for Genome Nexus
🚧 Under construction 🚧

## Install
### For users
TODO

### For developers
```
git clone https://github.com/genome-nexus/genome-nexus-cli
yarn
yarn build
yarn link
```

## Usage examples
Check the help docs:
```
genome-nexus --help
```

### Convert VCF to MAF ready for annotation
```
genome-nexus convert variants.vcf
```

### Get JSON output for a single variant
```
genome-nexus annotate 17:g.41242962_41242963insGA
```
