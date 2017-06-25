# alrunner README

AL Runner allows you to run a NAV AL object using Alt+R like in good old (actually bad old) C/SIDE for the object in the current selection or Shift+Alt+R for the first object in the file


## Features

Provides two commands:
- "ALRunner: Run Selection" or Alt+R which runs the object in the currently selected line, if that is a page or pageextension object
- "ALRunner: Run object on first line" or Shift+Alt+R which runs the object on the first line of the current file


## Requirements

You need to have the Microsoft AL Extension up and running


## Known Issues

Only supports page and pageextension objects as the AL Extension launch config also only allows to set those object types as startup objects


## Known Issues

Future ideas:
- Run the current object
- Run an arbitrary object


## Release Notes


### 1.0.1

Add functionality to run a page or pageextension object in the first line of the current file ("ALRunner: Run object in first line", Shift+Alt+R). 

### 1.0.0

Initial release 
