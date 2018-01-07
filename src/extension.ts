'use strict';
import { window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument, TextEditor, ViewColumn, workspace, TextLine, TextEdit, Uri } from 'vscode';
import { worker } from 'cluster';
import * as templates from './templates';
import * as http from 'http';
import { tableTemplateAfter, tableKeyTemplate } from './templates';
import { basename } from 'path';

const open = require('opn');
const fs = require('fs');
const request = require('request');
const download = require('download-file');
const path = require('path');
const ResourceManagement = require('azure-arm-resource');
const msRest = require('ms-rest');
const msRestAzure = require('ms-rest-azure');
const cp = require('copy-paste');

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

    let disp5 = commands.registerCommand('extension.generateObjectsFromURL', () => {
        alr.generateObjectsFromURL();
    });

    let disp6 = commands.registerCommand('extension.generateObjectsFromEditor', () => {
        alr.generateObjectsFromEditor(window.activeTextEditor);
    });

    let disp7 = commands.registerCommand('extension.goAzure', () => {
        alr.goAzure();
    });

    context.subscriptions.push(disp);
    context.subscriptions.push(disp2);
    context.subscriptions.push(disp3);
    context.subscriptions.push(disp4);
    context.subscriptions.push(disp5);
    context.subscriptions.push(disp6);
    context.subscriptions.push(disp7);

    workspace.findFiles('initializeme.alrunner').then(
        r => {
            let basePath = workspace.rootPath;
            fs.unlinkSync(path.join(basePath, 'initializeme.alrunner'));

            let baseURL = 'https://raw.githubusercontent.com/tfenster/azure-quickstart-templates/api-enabled-nav/aci-dynamicsnav-api-enabled/';

            download(baseURL + 'azuredeploy.json', {
                directory: path.join(basePath, 'arm-templates', 'aci-dynamicsnav-api-enabled'),
                filename: 'azuredeploy.json'
            });

            download(baseURL + 'azuredeploy.parameters.json', {
                directory: path.join(basePath, 'arm-templates', 'aci-dynamicsnav-api-enabled'),
                filename: 'azuredeploy.parameters.json'
            });

            let options = {
                userCodeResponseLogger: function (message) {
                    let startsWithCode = message.substring(message.indexOf('devicelogin and enter the code ') + 31);
                    let codeOnly = startsWithCode.substring(0, startsWithCode.indexOf(' '));
                    cp.copy(codeOnly);

                    window.showInformationMessage(
                        'You will now need to log in to Azure. Click log in and paste the ID ' + codeOnly + ' that is already copied to the clipboard into the entry field', {
                            title: 'Log in'
                        }).then(function (btn) {
                            if (btn && btn.title == 'Log in') {
                                open('https://aka.ms/devicelogin');
                            }
                        });
                }
            };

            msRestAzure.interactiveLogin(options, function (err, credentials, subscriptions) {
                if (err) {
                    console.log(err);
                    return;
                }
                window.showInformationMessage('Now you will need to select the subscription and resource group you want to use').then(r => {
                    let subscriptionsForPick = [];
                    subscriptions.forEach(element => {
                        subscriptionsForPick.push(element.name);
                    });
                    window.showQuickPick(subscriptionsForPick)
                        .then(selected => {
                            let selectedSub = subscriptions.filter(sub => {
                                return sub.name == selected;
                            });
                            alr.deployTemplate(credentials, function (err, result) {
                                if (err)
                                    return console.log(err);
                                console.log('template deployed to azure! Now wait a bit as it takes some time until the container is actually reachable');
                                setTimeout(function () {
                                    let ip = result.properties.outputs.containerIPv4Address.value;
                                    window.showInformationMessage(
                                        'Deployment was successful! You can reach the WebClient at https://' + ip + '/nav/webclient', {
                                            title: 'Get access data'
                                        }).then(function (btn) {
                                            if (btn && btn.title == 'Get access data') {
                                                open('http://' + ip + ':8080/accessdata.html');
                                            }
                                            alr.generateAPIClient(ip);
                                        });
                                }, 2 * 60 * 1000);
                            },
                                path.join(workspace.rootPath, 'arm-templates', 'aci-dynamicsnav-api-enabled', 'azuredeploy.json'),
                                path.join(workspace.rootPath, 'arm-templates', 'aci-dynamicsnav-api-enabled', 'azuredeploy.parameters.json'),
                                selectedSub[0].id);
                        });
                });
            });

        }
    );
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

    public generateObjectsFromEditor(editor: TextEditor) {
        let alr = this;
        window.showInputBox({ prompt: 'From which URL do you want to read JSON data? (only for generating access code in AL)' })
            .then(val => {
                if (val === undefined) {
                    return;
                }

                window.showInputBox({ prompt: 'What entity are you reading?' })
                    .then(val2 => {
                        if (val2 === undefined) {
                            return;
                        }
                        alr.DoGenerate(editor.document.getText(editor.selection), val2, val);
                    });
            });


    }

    public generateObjectsFromURL() {
        let alr = this;
        window.showInputBox({ prompt: 'From which URL do you want to read JSON data?' })
            .then(val => {
                if (val === undefined) {
                    return;
                }

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
                    window.showInputBox({ prompt: 'What entity are you reading?' })
                        .then(val2 => {
                            if (val2 === undefined) {
                                return;
                            }
                            alr.DoGenerate(body, val2, val);
                        });
                });
            });

    }

    public goAzure() {
        window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Use this folder'
        }).then(r => {
            fs.writeFile(path.join(r[0].fsPath, 'initializeme.alrunner'), '', (err) => {
                if (err) {
                    console.log(err);
                    return;
                }
                commands.executeCommand("vscode.openFolder", r[0], false);
            });
        });
    }

    public deployTemplate(credentials, callback, templateFilePath, templateParametersFilePath, subscriptionId) {
        let resourceGroupName = '';
        let deploymentName = 'acinavapi';

        let template;
        let templateParameters;

        try {
            template = JSON.parse(fs.readFileSync(templateFilePath));
            templateParameters = JSON.parse(fs.readFileSync(templateParametersFilePath));
        } catch (error) {
            callback(error);
        }

        if (templateParameters.parameters)
            templateParameters = templateParameters.parameters;

        var parameters = {
            properties: {
                template: template,
                parameters: templateParameters,
                mode: 'Complete'
            }
        };

        var resourceClient = new ResourceManagement.ResourceManagementClient(credentials, subscriptionId);
        resourceClient.resourceGroups.list(function (err, result) {
            let rgs = [];
            result.forEach(element => {
                rgs.push(element.name);
            });
            window.showQuickPick(rgs)
                .then(selected => {
                    window.showInformationMessage('Deployment was started');
                    resourceClient.deployments.createOrUpdate(selected, deploymentName, parameters, callback);
                });
        });
    }

    public generateAPIClient(ip: string) {
        let reqOptions = {
            url: 'http://' + ip + ':8080/accessdata.html',
            headers: {
                'User-Agent': 'request'
            }
        };

        request(reqOptions, function (error, response, body) {
            let username = body.substring(body.indexOf('Username:') + 9);
            username = username.substring(0, username.indexOf('<br />'));

            let password = body.substring(body.indexOf('Password:') + 9);
            password = password.substring(0, password.indexOf('</p>'));

            let reqOptionsAuth = {
                url: 'https://' + ip + ':7048/nav/api/beta/customers',
                headers: {
                    'User-Agent': 'request'
                },
                auth: {
                    user: username,
                    pass: password,
                    sendImmediately: false
                },
                rejectUnauthorized: false,
                strictSSL: false
            };

            request(reqOptionsAuth, function (error, response, body) {
                let jsonObject = JSON.parse(body);
                let custid = jsonObject.value[0].id;
                let custname = jsonObject.value[0].displayName;
                let etag = jsonObject.value[0]["@odata.etag"];

                let httpContent = templates.APIClientTemplate.replace(/##username##/g, username);
                httpContent = httpContent.replace(/##password##/g, password);
                httpContent = httpContent.replace(/##ip##/g, ip);
                httpContent = httpContent.replace(/##custid##/g, custid);
                httpContent = httpContent.replace(/##custname##/g, custname);
                httpContent = httpContent.replace(/##etag##/g, etag);

                fs.writeFile(path.join(workspace.rootPath, 'sample.http'), httpContent, (err) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    workspace.openTextDocument(path.join(workspace.rootPath, 'sample.http'));
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

        let members: Member[] = []

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
            let newField = templates.tableFieldTemplate.replace('##id##', '' + count).replace(/##name##/g, m.name);
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
