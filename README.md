# license-tool

A tool to validate license header, or modify license of target file.

__Please manually verify the programmatic fixes before commit to your repository.__

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

## Usage

### Help Information

```
Usage: license-tool [options] <folder|file>

Options:
  --version         Show version number                                [boolean]
  -L, --standalone  license file stays in root folder
                                            [default: "licenses/standalone.txt"]
  -H, --header      license attached to file header
                                                [default: "licenses/header.txt"]
  -X, --exclude     exclude extra files/folders pattern
  -Y, --years       each file license start year
  -f, --fix         if let the tool fixes the license errors
                                                      [boolean] [default: false]
  -v, --verbose     show more processing details      [boolean] [default: false]
  -h, --help        Show help                                          [boolean]
```

### Configure License Files

Update the default license files located in `licenses` folder, or you can specify command line options of `--header` and/or `--standaline`.

### My License Header Requires Year Range

There is special macro `{year}` you can put in header license file. The macro will be replaced with the correct license year range when parsing that file.

For example, if the file has existing license `Copyright abc company 2016`. Then if current year is 2018, then the `{years}` will be parsed to `2016, 2018`, and expected license will be `Copyright abc company 2016, 2018`.

### Exclude More Files/Folders

By default, if the folder has `.gitignore`, the tool will pick up and exclude all files/folders defined there.

Otherwise, you can specify `-X` or `--exclude` option to define how you want to exclude. You can combine multiple patterns with `;` separated. For example, `-X index.js;node_modules/**/*`.

For how to define pattern, you can follow [glob](https://www.npmjs.com/package/glob).

### My Files Doesn't Have Accurate License Start Year

You can define license start year for each file.

- You can define in the command line by separating each file with comma. For example, `license-tool . -Y path/to/my/file1.js:2010,path/to/my/file2.js:2011`.
- You can put all definitions in a file. In the file, each file stays in one line, and follow with `:` and year. An example file:

```
path/to/my/file1.js:2010
path/to/my/file2.js:2011
```

Then you can use command `license-tool . -Y /path/to/your/definition/file`.

### Check License Verification Result In Your Pipeline

```groovy
def licenseErrors = sh(script: "license-tool . -H /path/to/my/header.txt -L /path/to/my/standalone.txt | grep 'should be fixed'", returnStdout: true)
```

## Known Issues

- Inline comments is not supported because it may involve more complicated semantic check on the source code. For example, these comments won't be recognized:
```javascript
  let v1 = '1';  /* won't be recognized */
  let v2 = '2';  // won't be recognized
```
- The parser may wrongly recognize comments within multiple-lines string because it doesn't do semantic check.
