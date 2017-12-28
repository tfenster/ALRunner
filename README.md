# AL Runner README

AL Runner allows you to compile and publish your application and run a NAV AL page object using Alt+P for the object in the current selection or Shift+Alt+P for the first object in the file. It also allows you to just run (no compile and publish) a NAV AL page or report object using Alt+R like in good old (actually bad old) C/SIDE for the object in the current selection or Shift+Alt+R for the first object in the file.
The second part of AL Runner allows you to parse a JSON object and generate AL objects from it (leaning heavily on [AJ Kauffmann's Github repo](https://github.com/ajkauffmann/ALCodeSamples), thanks for that!)


## Features

Provides five commands:
- "ALRunner: Run selection" or Alt+R which runs the object in the currently selected line, if that is a page or report object
- "ALRunner: Run object on first line" or Shift+Alt+R which runs the object on the first line of the current file, if that is a page or report object
- "ALRunner: Publish and run selection" or Alt+P which publishes your extension and runs the object in the currently selected line, if that is a page object. Note: This changes your launch config
- "ALRunner: Publish and run object on first line" or Shift+Alt+P which publishes your extension and runs the object on the first line of the current file, if that is a page object. Note: This changes your launch config
- "ALRunner: Generate objects by parsing a JSON object from a URL" asks you for a URL, which should return a JSON file (authentication currently not supported) and then for the name of the entity represented by that JSON file. It then generates a table structured like the JSON file, a page showing that table and a codeunit with a function to refresh that data
- "ALRunner: Generate objects by parsing a JSON object in the current selection" does the same as the previous command but uses the currently selected text as data for parsing. This als asks you for a URL, which is only used for generating the AL code do download data and then for the name of the entity represented by that JSON file. With this command you code download a JSON object using authentication and then put the result into VS Code, select the relevant part and let generation run. For nested objects you could do the same but would need to handle linking parent and child objects


## Requirements

- You need to have the Microsoft AL Extension up and running (easiest way to get to that point is [here](https://msdn.microsoft.com/en-us/dynamics-nav/newdev-get-started))
- opn ^4.0.2
- request ^2.83.0


## Known Issues

- Only supports page objects for "publish and run" as the AL Extension launch config also only allows to set those object types as startup objects
- Only supports page and report objects for "run" as the NAV Web Client also only allows to run those object types directly
- Only works for the first configuration in your launch config
- Generating objects for JSON doesn't support authorization and ignores nested structures. You might use the "parse current selection" feature to work around those limitations


## Future ideas

- Run the current object even if the selection is somewhere down the object
- Run an arbitrary object
- Find out which base page object a pageextension changes and run that
- Allow to configure if full, tablet or phone Web Client is run
- Support authorization and nested structures in JSON


## Release Notes

Notes for the released versions

### 2.4.1

Add double quotes around field names

### 2.4.0

Add support for parsing the current selection additionally to downloading it

### 2.3.0

Slight problems with vsce...

### 2.0.1

Fix missing dependency for request

### 2.0.0

Add support for JSON parsing and AL code generation (thanks a lot to AJ Kauffmann for the AL base code!)

### 1.1.1

Documentation fixes 

### 1.1.0

Add the ability not only to publish and run but also to directly run. This also adds the ability to run Reports

### 1.0.2

Documentation fixes 

### 1.0.1

Add functionality to run a page or pageextension object in the first line of the current file ("ALRunner: Run object in first line", Shift+Alt+R). 

### 1.0.0

Initial release 
