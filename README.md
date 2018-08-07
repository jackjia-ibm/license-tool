# license-tool

A tool to validate license header, or modify license of target file.

## Install

### Install From Github Source Code

```
git clone https://github.com/jackjia-ibm/license-tool
cd license-tool
npm install
npm link
```

### Install From npm Registry

This tool is published to [npmjs.com](https://www.npmjs.com/package/license-tool).

```
npm install -g license-tool
```

_Please note: you need to make sure your registry is npmjs.com._

## Configure License Files

Update the default license files located in `licenses` folder, or you can specify command line options of `--header` and/or `--standaline`.

## Usage

```
Usage: license-tool [options] <folder|file>

Options:
  --version         Show version number                                [boolean]
  -L, --standalone  license file stays in root folder
                                            [default: "licenses/standalone.txt"]
  -H, --header      license attached to file header
                                                [default: "licenses/header.txt"]
  -f, --fix         if let the tool fixes the license errors
                                                      [boolean] [default: false]
  -v, --verbose     show more processing details      [boolean] [default: false]
  -h, --help        Show help                                          [boolean]
```
