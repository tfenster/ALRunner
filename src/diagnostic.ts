export class diagnosticOutput {
    constructor() {}
    
    fsPath: string;
    code: string | number;
    message: string;
    startLine: string | number;
    startCharacter: string | number;
    endLine: string | number;
    endCharacter: string | number;

    public toString(): string {
        return this.fsPath + '|' + this.code + '|' + this.message + '|' + this.startLine + '|' + this.startCharacter + '|' + this.endLine + '|' + this.endCharacter;
    }
}