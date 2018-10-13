export const tableTemplateBefore: string = `table 50100 ##entity##
{

    fields
    {
     
`;

export const tableFieldTemplate: string = `        field(##id##;"##name##";##type##)
        {
            CaptionML=ENU='##name##';
        }
`;

export const tableKeyTemplate: string = `    
    }

    keys
    {
        key(PK;id)
        {
            Clustered = true;
        }
`;

export const tableTemplateAfter: string = `
    }

    procedure Refresh##entity##();
    var
        Refresh##entity## : Codeunit Refresh##entity##;
    begin
        Refresh##entity##.Refresh();
    end;

}
`;

export const pageTemplateBefore: string = `page 50100 ##entity##List
{
    PageType = List;
    SourceTable = ##entity##;
    CaptionML=ENU='List of ##entity##';
    Editable = false;
    SourceTableView=order(descending);
    ApplicationArea = All;
    UsageCategory = Lists;

    layout
    {
        area(content)
        {
            repeater(General)
            {
                
`;

export const pageFieldTemplate: string = `                field("##name##";"##name##") {
                    ApplicationArea = All;
                }
`;

export const pageTemplateAfter: string = `
            }
        }
    }

    actions
    {
        area(processing)
        {
            action(Refresh##entity##)
            {
                CaptionML=ENU='Refresh ##entity##';
                Promoted=true;
                PromotedCategory=Process;
                Image=RefreshLines;
                ApplicationArea = All;
                trigger OnAction();
                begin
                    Refresh##entity##();
                    CurrPage.Update;
                    if FindFirst then;
                end;
            }
        }
    }
}
`;

export const codeunitTemplateBefore: string = `codeunit 50100 Refresh##entity##
{
    procedure Refresh();
    var
        ##entity## : Record ##entity##;
        HttpClient : HttpClient;
        ResponseMessage : HttpResponseMessage;
        JsonToken : JsonToken;
        JsonValue : JsonValue;
        JsonObject : JsonObject;
        JsonArray : JsonArray;
        JsonText : text;
        i : Integer;
    begin
        ##entity##.DeleteAll;

        // Simple web service call
        HttpClient.DefaultRequestHeaders.Add('User-Agent','Dynamics 365');
        if not HttpClient.Get('##URL##',
                              ResponseMessage)
        then
            Error('The call to the web service failed.');

        if not ResponseMessage.IsSuccessStatusCode then
            error('The web service returned an error message:\\' +
                  'Status code: %1\' +
                  'Description: %2',
                  ResponseMessage.HttpStatusCode,
                  ResponseMessage.ReasonPhrase);
        
        ResponseMessage.Content.ReadAs(JsonText);
        
        // Process JSON response
        if not JsonArray.ReadFrom(JsonText) then begin
            // probably single object
            JsonToken.ReadFrom(JsonText);
            Insert##entity##(JsonToken);
        end else begin    
            // array
            for i := 0 to JsonArray.Count - 1 do begin
                JsonArray.Get(i,JsonToken);
                Insert##entity##(JsonToken);
            end;
        end;
    end;

    procedure Insert##entity##(JsonToken : JsonToken);
    var
        JsonObject : JsonObject;
        ##entity## : Record ##entity##;
    begin
        JsonObject := JsonToken.AsObject;

        ##entity##.init;
        
`;

export const codeunitFieldTemplate: string = `        ##entity##."##name##" := GetJsonToken(JsonObject,'##name##').AsValue.As##type##;
`;
export const codeunitTextFieldTemplate: string = `        ##entity##."##name##" := COPYSTR(GetJsonToken(JsonObject,'##name##').AsValue.AsText, 1, 250);
`;

export const codeunitTemplateAfter: string = `
        ##entity##.Insert;
    end;

    procedure GetJsonToken(JsonObject:JsonObject;TokenKey:text)JsonToken:JsonToken;
    begin
        if not JsonObject.Get(TokenKey,JsonToken) then
            Error('Could not find a token with key %1',TokenKey);
    end;
    procedure SelectJsonToken(JsonObject:JsonObject;Path:text)JsonToken:JsonToken;
    begin
        if not JsonObject.SelectToken(Path,JsonToken) then
            Error('Could not find a token with path %1',Path);
    end;

}
`;

export const APIClientTemplate: string = `@baseurl = ##baseurl##
@username = ##username##
@password = ##password##
@apibase = /api/beta

###
# get all services
GET {{baseurl}}{{apibase}}/
Authorization: Basic {{username}} {{password}}

###
# get all customers
GET {{baseurl}}{{apibase}}/companies(##companyid##)/customers
Authorization: Basic {{username}} {{password}}

###
# filter customers
GET {{baseurl}}{{apibase}}/companies(##companyid##)/customers?$filter=displayName eq '##custname##'
Authorization: Basic {{username}} {{password}}

###
# get a specific customer
GET {{baseurl}}{{apibase}}/companies(##companyid##)/customers(##custid##)
Authorization: Basic {{username}} {{password}}

###
# change a customer
PATCH {{baseurl}}{{apibase}}/companies(##companyid##)/customers(##custid##)
Authorization: Basic {{username}} {{password}}
Content-type: application/json
If-Match: ##etag##

{
  "displayName": "Axians Infoma"
}

###
# get journal lines
GET {{baseurl}}{{apibase}}/companies(##companyid##)/journals(##journalid##)/journalLines
Authorization: Basic {{username}} {{password}}

###
# add a journal line
POST {{baseurl}}{{apibase}}/companies(##companyid##)/journals(##journalid##)/journalLines
Authorization: Basic {{username}} {{password}}
Content-type: application/json

{
  "lineNumber": 60000,
  "accountNumber": "1220",
  "documentNumber": "1234",
  "amount": 1500,
  "description": "Increases during the Year",
  "comment": ""
}

###
# add a second journal line
POST {{baseurl}}{{apibase}}/companies(##companyid##)/journals(##journalid##)/journalLines
Authorization: Basic {{username}} {{password}}
Content-type: application/json

{
  "lineNumber": 50000,
  "accountNumber": "2910",
  "documentNumber": "1234",
  "amount": -1500,
  "description": "Urgent need",
  "comment": ""
}

###
# post a journal
POST {{baseurl}}{{apibase}}/companies(##companyid##)/journals(##journalid##)/Microsoft.NAV.post
Authorization: Basic {{username}} {{password}}

`;