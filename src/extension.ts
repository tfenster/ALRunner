'use strict';
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, TextEditor, ViewColumn, workspace, TextLine, TextEdit} from 'vscode';
import { worker } from 'cluster';
import * as templates from './templates';
import * as http from 'http';
import { tableTemplateAfter, tableKeyTemplate } from './templates';

const open = require('opn');
const fs = require('fs');

export function activate(context: ExtensionContext) {
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

    let disp5 = commands.registerCommand('extension.generateObjectsFromJson', () => {
        alr.generateObjectsFromJson(window.activeTextEditor);
    });

    context.subscriptions.push(disp);
    context.subscriptions.push(disp2);
    context.subscriptions.push(disp3);
    context.subscriptions.push(disp4);
    context.subscriptions.push(disp5);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class Member {
    name: string;
    type: string;
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

    public generateObjectsFromJson(editor: TextEditor) {
        let alr = this;
        window.showInputBox({prompt: 'From which URL do you want to read JSON data?'})
            .then(val => {
                if (val === undefined) {
                    return;
                }

                var request = require('request');
                var reqOptions = {
                    url: val,
                    headers: {
                      'User-Agent': 'request'
                    }
                };

                request(reqOptions, function (error, response, body) {
                    /*console.log('error:', error);
                    console.log('statusCode:', response && response.statusCode); 
                    console.log('body:', body); */
                    if (error !== undefined && error !== null) {
                        window.showErrorMessage('Failed to read the content. Error: ' + error);
                        return;
                    }
                    if (response.statusCode !== 200) {
                        window.showErrorMessage('Failed to read the content. Status code ' + response.statusCode + ' and body: ' + body);
                        return;
                    }
                    window.showInputBox({prompt: 'What entity are you reading?'})
                        .then(val2 => {
                            alr.DoGenerate(body, val2, val);
                        });
                });
            });
        
    }

    private DoGenerate(jsonText: string, entity: string, url: string) {
        
        let jsonObject = JSON.parse(jsonText);

        //console.log('is array: ' + Array.isArray(jsonObject));
        if (Array.isArray(jsonObject)) {
            jsonObject = jsonObject[0];
        }

        let members : Member[] = []

        Object.getOwnPropertyNames(jsonObject).forEach(
            function (val, idx, array) {
                let objType = typeof jsonObject[val];
                let m = new Member();
                m.name = val;
                if (objType === 'number') {
                    if (Number.isInteger(jsonObject[val])) {
                        m.type = 'Integer'
                    } else {
                        m.type = 'Decimal'
                    }
                } else if (objType === "boolean") {
                    m.type = 'Boolean';
                } else if (objType === "string") {
                    m.type = 'Text';
                } else if (objType === "object") {
                    // todo: support nested structures
                    return;
                } else {
                    m.type = 'Unknown';
                }
                members.push(m);
            }
        );

        let tableContent = templates.tableTemplateBefore.replace(/##entity##/g, entity);
        let count = 1;
        let hasId = false;
        members.forEach(m => {
            let newField = templates.tableFieldTemplate.replace('##id##', ''+count).replace(/##name##/g, m.name);
            if (m.type === 'Text') {
                newField = newField.replace('##type##', 'Text[250]');
            } else {
                newField = newField.replace('##type##', m.type);
            }
            if (m.name.toLowerCase() === 'id') {
                hasId = true;
            }
            tableContent += newField;
            count++;
        }); 
        if (hasId) {
            tableContent += templates.tableKeyTemplate;
        }
        tableContent += templates.tableTemplateAfter.replace(/##entity##/g, entity);
        this.generateAndOpenFile(tableContent);

        let pageContent = templates.pageTemplateBefore.replace(/##entity##/g, entity);
        members.forEach(m => {
            pageContent += templates.pageFieldTemplate.replace(/##name##/g, m.name);
        }); 
        pageContent += templates.pageTemplateAfter.replace(/##entity##/g, entity);
        this.generateAndOpenFile(pageContent);

        let codeunitContent = templates.codeunitTemplateBefore.replace(/##entity##/g, entity).replace('##URL##', url);
        members.forEach(m => {
            if (m.type === 'Text') {
                codeunitContent += templates.codeunitTextFieldTemplate.replace(/##name##/g, m.name).replace('##type##', m.type).replace(/##entity##/g, entity);
            } else {
                codeunitContent += templates.codeunitFieldTemplate.replace(/##name##/g, m.name).replace('##type##', m.type).replace(/##entity##/g, entity);
            }
        }); 
        codeunitContent += templates.codeunitTemplateAfter.replace(/##entity##/g, entity);
        this.generateAndOpenFile(codeunitContent);
    }

    private generateAndOpenFile(content: string) {
        let options: Object = {
            content: content,
            language: "al"
          };
          
          workspace.openTextDocument(options).then(doc => {
            window.showTextDocument(doc, { preview: false });
          }, err => {
            window.showErrorMessage(err);
          });
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