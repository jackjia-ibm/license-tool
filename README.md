# license-tool

A tool to validate license header, or modify license of target file.

## Install

```
npm install
npm link
```

## Configure License Files

Update the files located in `licenses` folder.

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
