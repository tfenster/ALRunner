import { Uri } from "vscode";

export class diagnosticOutput {
    constructor() {}
    
    fsPath: string;
    code: string | number;
    target: Uri;
    message: string;
    startLine: string | number;
    startCharacter: string | number;
    endLine: string | number;
    endCharacter: string | number;

    public toString(): string {
        return this.fsPath + '|' + this.code + '|' + this.message + '|' + this.startLine + '|' + this.startCharacter + '|' + this.endLine + '|' + this.endCharacter + '|' + this.target;
    }
}