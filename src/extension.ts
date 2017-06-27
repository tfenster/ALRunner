'use strict';
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, TextEditor, workspace, TextLine} from 'vscode';

const open = require('opn');

export function activate(context: ExtensionContext) {
    console.log('"alrunner" is now active!');

    let alr = new ALRunner();

    let disp = commands.registerCommand('extension.runSelection', () => {
        alr.runSelection(window.activeTextEditor);
    });

    let disp2 = commands.registerCommand('extension.runFirstObject', () => {
        alr.runFirstObject(window.activeTextEditor);
    });

    let disp3 = commands.registerCommand('extension.publishAndRunSelection', () => {
        alr.publishAndRunSelection(window.activeTextEditor);
    });

    let disp4 = commands.registerCommand('extension.publishAndRunFirstObject', () => {
        alr.publishAndRunFirstObject(window.activeTextEditor);
    });

    context.subscriptions.push(disp);
    context.subscriptions.push(disp2);
    context.subscriptions.push(disp3);
    context.subscriptions.push(disp4);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class ALRunner {
    public runSelection(editor: TextEditor) {
        // find the currently active line
        let line = editor.document.lineAt(editor.selection.active.line);
        
        this.runObjectOnLine(line, false);
    }

    public runFirstObject(editor: TextEditor) {
        // find the first line
        let line = editor.document.lineAt(0);

        this.runObjectOnLine(line, false);
    }

    public publishAndRunSelection(editor: TextEditor) {
        // find the currently active line
        let line = editor.document.lineAt(editor.selection.active.line);
        
        this.runObjectOnLine(line, true);
    }

    public publishAndRunFirstObject(editor: TextEditor) {
        // find the first line
        let line = editor.document.lineAt(0);

        this.runObjectOnLine(line, true);
    }

    private runObjectOnLine(line: TextLine, publish: boolean) {
        if (line != null && line.text != null) {
            console.log('working on');
            console.log(line);
            let lowertext = line.text.toLowerCase();

            // can only handle page or report objects
            if (lowertext.startsWith('page ') || lowertext.startsWith('report')) {
                if (lowertext.startsWith('report') && publish) {
                    window.showErrorMessage('Publish and run is not supported for reports, only run without publish');
                    return;
                }
                let tokens = lowertext.split(' ');
                if (isNaN(Number(tokens[1]))) {
                    window.showErrorMessage('Did not find an object number where I expected one. Are you at the first line of an object?');
                } else {
                    let config = workspace.getConfiguration('launch');
                    let currentConfig = config.configurations;
                    if (publish) {
                        // found a valid object id, now change the launch config and call publish (which will also launch the object)
                        currentConfig[0].startupObjectId = Number(tokens[1]);
                        config.update('configurations', currentConfig);
                        commands.executeCommand('al.publish');
                    } else {
                        // found a valid object id, now run it
                        let server = currentConfig[0].server;
                        let serverInstance = currentConfig[0].serverInstance;
                        let objecttype = 'Page';
                        if (lowertext.startsWith('report')) {
                            objecttype = 'Report';
                        }
                        open(server + '/' + serverInstance + '/WebClient/default.aspx?' + objecttype + '=' + tokens[1]);
                    }
                }
            } else {
                window.showErrorMessage('Did not find a page or report object in the current line. Are you at the first line of a page or report?')
            }
        }
    }
}