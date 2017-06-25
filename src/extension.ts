'use strict';
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, workspace, TextLine} from 'vscode';

export function activate(context: ExtensionContext) {
    console.log('"alrunner" is now active!');

    let alr = new ALRunner();

    let disp = commands.registerCommand('extension.runSelection', () => {
        alr.runSelection();
    });

    let disp2 = commands.registerCommand('extension.runFirstObject', () => {
        alr.runFirstObject();
    });

    context.subscriptions.push(disp);
    context.subscriptions.push(disp2);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class ALRunner {
    public runSelection() {
        // get the editor context and find the currently active line
        let editor = window.activeTextEditor;
        let line = editor.document.lineAt(editor.selection.active.line);
        
        this.runObjectOnLine(line);
    }

    public runFirstObject() {
        // get the editor context and find the first line
        let editor = window.activeTextEditor;
        let line = editor.document.lineAt(0);

        this.runObjectOnLine(line);
    }

    private runObjectOnLine(line: TextLine) {
        if (line != null && line.text != null) {
            console.log('working on');
            console.log(line);
            let lowertext = line.text.toLowerCase();

            // can only handle page or pageextension objects
            if (lowertext.startsWith('page') || lowertext.startsWith('pageextension')) {
                let tokens = lowertext.split(' ');
                if (isNaN(Number(tokens[1]))) {
                    window.showErrorMessage('Did not find an object number where I expected one. Are you at the first line of an object?');
                } else {
                    // found a valid object id, now change the launch config and call publish (which will also launch the object)
                    let config = workspace.getConfiguration('launch');
                    let currentConfig = config.configurations;
                    currentConfig[0].startupObjectId = Number(tokens[1]);
                    config.update('configurations', currentConfig);
                    commands.executeCommand('al.publish');
                }
            } else {
                window.showErrorMessage('Did not find a page or pageextension object in the current line. Are you at the first line of a page or pageextension?')
            }
        }
    }
}