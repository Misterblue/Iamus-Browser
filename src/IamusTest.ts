//   Copyright 2020 Vircadia Contributors
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

'use strict';

const API_ACCOUNT_LOGIN = '/oauth/token';
const API_ACCOUNT_CREATE = '/api/v1/users';
const API_GET_TOKEN = '/api/v1/token/new';
const API_GET_ACCOUNTS = '/api/v1/accounts';
const API_GET_USERS = '/api/v1/users';
const API_GET_DOMAINS = '/api/v1/domains';
const API_GET_TOKENS = '/api/v1/tokens';
const API_GET_PLACES = '/api/v1/places';
const API_GET_RELATIONSHIP = '/api/v1/relationships';
const API_GET_REQUESTS = '/api/v1/requests';
const API_GET_MAINT_RAW = '/api/maint/raw';

// a casting interface used to index fields of an object (the *Info's, for instance)
interface Indexable {
    [ key: string ]: any;
};

type AuthToken = string;
interface AuthTokenInfo {
    token: string,
    token_type: string,
    scope: string,
    refresh_token: string,
    accountId: string
};
interface AccountInfo {
    accountId: string,
    username: string,
    email: string,
    administrator: boolean,
    publicKey: string,
    images: {
        tiny: string,
        hero: string,
        thumbnail: string
    },
    location: {
        connected: boolean,
        path: string,
        placeId: string,
        domainId: string,
        networkAddress: string,
        networkPort: number,
        nodeId: string,
        discoverability: string // one of 'none', 'friends', 'connections', 'all'
    },
    friends: string,
    connections: string,
    whenAccountCreated: string,
    timeOfLastHeartbeat: string,
};
interface UserInfo {
    accountId: string,
    username: string,
    images: {
        tiny: string,
        hero: string,
        thumbnail: string
    },
    location: {
        connected: boolean,
        path: string,
        placeId: string,
        domainId: string,
        networkAddress: string,
        networkPort: number,
        nodeId: string,
        discoverability: string // one of 'none', 'friends', 'connections', 'all'
    }
};
interface DomainInfo {
    domainid: string,
    place_name: string,
    public_key: string,
    sponsor_account_id: string,
    ice_server: string,
    version: string,
    protocol_version: string,
    network_addr: string,
    networking_mode: string,
    restricted: string,
    num_users: number,
    anon_users: number,
    total_users: number,
    capacity: number,
    description: string,
    maturity: string,
    restriction: string,
    hosts: string[],
    tags: string[],
    time_of_last_heartbeat: string,
    last_sender_key: string,
    addr_of_first_contact: string,
    when_domain_entry_created: string
};
interface TokenInfo {
    tokenId: string,
    token: string,
    accountId: string,
    refresh_token: string,
    scope: string,
    creation_time: string,
    expiration_time: string
};
interface DomainInfoSmall {
    id: string,
    name: string,
    network_address: string,
    ice_server_address: string
};
interface PlaceInfo {
    placeId: string,
    name: string,
    address: string,
    description: string,
    maturity: string,
    tags: string[],
    domain: DomainInfoSmall,
    accountId: string
};
interface RequestInfoX {
    id: string,
    type: string,
    requesterId: string,
    targetId: string,
    when_created: string,
    expiration_time: string,
    connection: {
        requesting_account_id: string,
        requestor_accepted: boolean,
        target_account_id: string,
        target_accepted: boolean
    }
};

// Information on current user
let gLoginUser = '';
let gLoginTokenInfo: AuthTokenInfo = {} as AuthTokenInfo;
let gDomainToken: AuthToken = {} as AuthToken;
let gAccountsInfo: AccountInfo[];
let gUsersInfo: UserInfo[];
let gDomainsInfo: DomainInfo[];
let gTokensInfo: TokenInfo[];
let gPlacesInfo: PlaceInfo[];
let gRequestInfo: RequestInfoX[];

document.addEventListener('DOMContentLoaded', ev => {
    // Make all 'class=clickable' page items create events
    Array.from(document.getElementsByClassName('clickable')).forEach( nn => {
        nn.addEventListener('click', DoOnClickable);
    });
});
// Event from a 'clickable' class'ed element.
// If it has an 'op' attriute, call that named function
function DoOnClickable(evnt: Event): void {
    const buttonOp = (evnt.target as HTMLElement).getAttribute('op');
    if (buttonOp) {
        DebugLog('DoOnClickable: click op ' + buttonOp);
        // @ts-ignore
        const buttonFunc = window[buttonOp];
        if (typeof(buttonFunc) === 'function') {
            buttonFunc(evnt);
        }
        else {
            ErrorLog(`DoOnClickable: attempt to do non-function ${buttonOp}`);
        };
    };
};
// Global debug information printout.
const logToConsole = false;
function LogMessage(msg: string , classs?: string ): void {
    if (logToConsole) {
        // tslint:disable-next-line:no-console
        console.log(msg);
    }
    else {
        // Adds a text line to a div and scroll the area
        const debugg = document.getElementById('DEBUGG');
        if (debugg) {
            const newLine = document.createElement('div');
            newLine.appendChild(document.createTextNode(msg));
            if (classs) {
                newLine.setAttribute('class', classs);
            };
            debugg.appendChild(newLine);
            if (debugg.childElementCount > 20) {
                debugg.removeChild(debugg.firstChild);
            };
        };
    };
};
function DebugLog(msg: string): void {
    LogMessage(msg, undefined);
};
function ErrorLog(msg: string): void {
    LogMessage(msg, 'v-errorText');
};

function GetElementValue(elementId: string): string {
    const el = document.getElementById(elementId) as HTMLTextAreaElement
    return el.value.trim();
};
function GetSelectedValue(elementId: string): string {
    const selection = document.getElementById(elementId) as HTMLSelectElement;
    const selectionValue = selection.options[selection.selectedIndex].value.trim();
    return selectionValue;
};
function SetTextInElement(elementId: string, theText: string): void {
    const textNode = document.createTextNode(theText);
    const theElement = document.getElementById(elementId);
    theElement.innerHTML = '';
    theElement.appendChild(textNode);
};
// Fetch and return the metaverse-server URL.
// Removes trailing slashes as things get confused if it exists.
function ServerURL(): string {
    let theURL = GetElementValue('v-server-url');
    while (theURL.endsWith('/')) {
        theURL = theURL.slice(0, -1);
    };
    return theURL;
};

function OpCreateAccount(evnt: Event): void {
    const username = GetElementValue('v-new-username');
    const passwd = GetElementValue('v-new-password');
    const useremail = GetElementValue('v-new-email');
    DebugLog('username=' + username + ', email=' + useremail);

    if (username.length < 1 || passwd.length < 2 || useremail.length < 5) {
        ErrorLog('You must specify a value for all three account fields');
        return;
    }

    CreateUserAccount(username, passwd, useremail)
    .then( () => {
        GetUserAccessToken(username, passwd)
        .then( accountTokenInfo => {
            DisplaySuccessfulLogin(username, accountTokenInfo);
        })
        .catch ( err => {
            ErrorLog('Could not fetch account token: ' + err);
        });
    })
    .catch ( err => {
        ErrorLog('Could not create account: ' + err);
    });
};
// The user is asking to login
function OpLogin(evnt: Event): void {
    const username = GetElementValue('v-login-username');
    const passwd = GetElementValue('v-login-password');
    DebugLog('Start login for ' + username);
    if (username.length < 1 || passwd.length < 2) {
        ErrorLog('You must specify a value for both username and password');
        return;
    }
    GetUserAccessToken(username, passwd)
    .then ( tokenInfo => {
        DisplaySuccessfulLogin(username, tokenInfo);
    })
    .catch ( err => {
        ErrorLog('Failed login: ' + err);
    });
};
function OpGetDomainToken(evnt: Event): void {
    const username = GetElementValue('v-username');
    const passwd = GetElementValue('v-password');

    if (username.length < 1 || passwd.length < 2) {
        ErrorLog('You must specify a value for both username and password');
        return;
    }

    GetDomainTokenWithAccount(username, passwd)
    .then( domainToken => {
        DisplayDomainToken(domainToken);
    })
    .catch ( err => {
        ErrorLog('Could not fetch domain token: ' + err);
    });
};
function OpAccountList(evnt: Event): void {
    const asAdmin = (document.getElementById('v-checkbox-asadmin') as HTMLInputElement).checked;
    FetchAccountList(asAdmin)
    .then( acctList => {
        DebugLog('OpAccountList: accounts fetched: ' + acctList.length);
        gAccountsInfo = acctList;
        DisplayAccounts();
    })
    .catch( err => {
        ErrorLog('Could not fetch accounts: ' + err);
    });
};
function OpUserList(evnt: Event): void {
    const asAdmin = (document.getElementById('v-checkbox-asadmin') as HTMLInputElement).checked;
    FetchUserList(asAdmin)
    .then( userList => {
        DebugLog('OpUserList: users fetched: ' + userList.length);
        gUsersInfo = userList;
        DisplayUsers();
    })
    .catch( err => {
        ErrorLog('Could not fetch users: ' + err);
    });
};
function OpDomainList(evnt: Event): void {
    const asAdmin = (document.getElementById('v-checkbox-asadmin') as HTMLInputElement).checked;
    FetchDomainList(asAdmin)
    .then( domList => {
        DebugLog('OpDomainsList: domains fetched: ' + domList.length);
        gDomainsInfo = domList;
        DisplayDomains();
    })
    .catch( err => {
        ErrorLog('Could not fetch domains: ' + err);
    });
};
function OpTokenList(evnt: Event): void {
    const asAdmin = (document.getElementById('v-checkbox-asadmin') as HTMLInputElement).checked;
    FetchTokenList(asAdmin)
    .then( tokList => {
        DebugLog('OpTokenList: tokens fetched: ' + tokList.length);
        gTokensInfo = tokList;
        DisplayTokens();
    })
    .catch( err => {
        ErrorLog('Could not fetch tokens: ' + err);
    });
};
function OpPlacesList(evnt: Event): void {
    const asAdmin = (document.getElementById('v-checkbox-asadmin') as HTMLInputElement).checked;
    FetchPlacesList(asAdmin)
    .then( placeList => {
        DebugLog('OpPlacesList: places fetched: ' + placeList.length);
        gPlacesInfo = placeList;
        DisplayPlaces();
    })
    .catch( err => {
        ErrorLog('Could not fetch places: ' + err);
    });
};
function OpRequestList(evnt: Event): void {
    const asAdmin = (document.getElementById('v-checkbox-asadmin') as HTMLInputElement).checked;
    FetchRequestList(asAdmin)
    .then( requestList => {
        DebugLog('OpRequestList: requests fetched: ' + requestList.length);
        gRequestInfo = requestList;
        DisplayRequests();
    })
    .catch( err => {
        ErrorLog('Could not fetch relationships: ' + err);
    });
};
function OpDeleteAccount(evnt: Event): void {
    const accountId = GetElementValue('v-delete-account-accountId');

    const opURL = '/api/v1/account/' + accountId;

    DoDeleteOp(gLoginTokenInfo, opURL)
    .then( result => {
        DebugLog('Response received: ' + JSON.stringify(result));
    })
    .catch ( err => {
        ErrorLog('DeleteAccount: exception: ' + err);
    });
};
function OpDeleteDomain(evnt: Event): void {
    const domainId = GetElementValue('v-delete-domain-domainId');

    const opURL = '/api/v1/domains/' + domainId;

    DoDeleteOp(gLoginTokenInfo, opURL)
    .then( result => {
        DebugLog('Response received: ' + JSON.stringify(result));
    })
    .catch ( err => {
        ErrorLog('DeleteDomain: exception: ' + err);
    });
};
function OpDeletePlace(evnt: Event): void {
    const placeId = GetElementValue('v-delete-place-placeId');

    const opURL = '/api/v1/places/' + placeId;

    DoDeleteOp(gLoginTokenInfo, opURL)
    .then( result => {
        DebugLog('Response received: ' + JSON.stringify(result));
    })
    .catch ( err => {
        ErrorLog('DeletePlace: exception: ' + err);
    });
};
function OpDeleteToken(evnt: Event): void {
    const accountId = GetElementValue('v-delete-token-accountId');
    const tokenId = GetElementValue('v-delete-token-tokenId');

    const opURL = '/api/v1/account/' + accountId + '/tokens/' + tokenId;

    DoDeleteOp(gLoginTokenInfo, opURL)
    .then( result => {
        DebugLog('Response received: ' + JSON.stringify(result));
    })
    .catch ( err => {
        ErrorLog('DeleteDomain: exception: ' + err);
    });
};
    // '/api/v1/user/friends/:username'
    // '/api/v1/user/roles/:role'
function OpRawUpdated(evnt: Event): void {
    const collection = GetElementValue('v-raw-collection');
    const field = GetElementValue('v-raw-field');
    const value = GetElementValue('v-raw-value');

    const fetchURL = API_GET_MAINT_RAW + '/' + collection + '/' + field + '/' + value;
    DebugLog('Fetching ' + fetchURL);
    GetDataFromServer(fetchURL)
    .then( data => {
        DebugLog('Response received ');
        const dataPlace = document.getElementById('v-raw-display');
        dataPlace.innerHTML = '';
        dataPlace.appendChild(makeText(JSON.stringify(data, null, '  ')));
    })
    .catch( err => {
        ErrorLog('Error fetching raw data: ' + err);
    });
};
function OpGetRawAPI(evnt: Event): void {
    DebugLog('OpGetRawAPI');
    const getURL = GetElementValue('v-raw-api-get');
    const xError:boolean = (document.getElementById('v-checkbox-x-error') as HTMLInputElement).checked;

    const request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE) {
            if (this.status === 200) {
                const response = JSON.parse(request.responseText);
                DebugLog("Login response = " + request.responseText);
                if (response.error) {
                    // There was an error logging in
                    ErrorLog(response.error);
                }
                else {
                    const dataPlace = document.getElementById('v-raw-display');
                    dataPlace.innerHTML = '';
                    dataPlace.appendChild(makeText(JSON.stringify(response, null, '  ')));
                };
            }
            else {
                ErrorLog("Failed fetch");
            };
        }
    };
    request.open("GET", ServerURL() + getURL);
    request.setRequestHeader('Authorization', gLoginTokenInfo.token_type + ' ' + gLoginTokenInfo.token);
    if (xError) {
        request.setRequestHeader('x-vircadia-error-handle', `badrequest`);
    };
    request.send();
};
function OpGetRawAPIMulti(evnt: Event): void {
    OpGetRawAPI(evnt);
    OpGetRawAPI(evnt);
    OpGetRawAPI(evnt);
};
function OpPostRawAPI(evnt: Event): void {
    const postURL = GetElementValue('v-raw-api-post');
    const postContentsJSON = GetElementValue('v-raw-api-post-data');
    const xError:boolean = (document.getElementById('v-checkbox-x-error') as HTMLInputElement).checked;
    try {
        const postContents = JSON.parse(postContentsJSON);

        const request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE) {
                if (this.status === 200) {
                    const response = JSON.parse(request.responseText);
                    DebugLog("Login response = " + request.responseText);
                    if (response.error) {
                        // There was an error logging in
                        ErrorLog(response.error);
                    }
                    else {
                        const dataPlace = document.getElementById('v-raw-display');
                        dataPlace.innerHTML = '';
                        dataPlace.appendChild(makeText(JSON.stringify(response, null, '  ')));
                    };
                }
                else {
                    ErrorLog(`POST failed: ${this.status}`);
                };
            }
        };
        request.open("POST", ServerURL() + postURL);
        request.setRequestHeader('Content-type', 'application/json');
        request.setRequestHeader('Authorization',
                gLoginTokenInfo.token_type + ' ' + gLoginTokenInfo.token);
        if (xError) {
            request.setRequestHeader('x-vircadia-error-handle', `badrequest`);
        };
        request.send(JSON.stringify(postContents));
    }
    catch (err) {
        ErrorLog(`Parsing of input JSON failed: "${postContentsJSON}" => ${err}`);
    };
};
function OpDoRandomTest(evnt: Event): void {
    const testData = GetElementValue('v-raw-random-test');
    const result = /^[A-Za-z][A-Za-z0-9+\-_\.]*$/.test(testData);
    LogMessage(`Random test: ${testData} => ${result}`);
};
// ============================================================================
// Use account information to get account token and use that to get domain token
function GetDomainTokenWithAccount(pUsername: string, pPassword: string): Promise<AuthToken> {
    return new Promise( (resolve, reject) => {
        GetUserAccessToken(pUsername, pPassword)
        .then( accountTokenInfo => {
            GetDomainToken(accountTokenInfo)
            .then( domainToken => {
                DebugLog('Successful domain token creation');
                resolve(domainToken);
            })
            .catch ( err => {
                reject('Could not fetch domain token: ' + err);
            });
        })
        .catch ( err => {
            reject('Could not fetch account access token: ' + err);
        });
    });
};
// Return a Promise that returns an access token for the specified account.
// The returned 'token' has multiple fields describing the token, it's type, ...
function GetUserAccessToken(pUsername: string, pPassword: string): Promise<AuthTokenInfo> {
    return new Promise( (resolve , reject) => {
        const queries = [];
        queries.push(encodeURIComponent('grant_type') + '=' + encodeURIComponent('password'));
        queries.push(encodeURIComponent('username') + '=' + encodeURIComponent(pUsername));
        queries.push(encodeURIComponent('password') + '=' + encodeURIComponent(pPassword));
        queries.push(encodeURIComponent('scope') + '=' + encodeURIComponent('owner'));
        const queryData = queries.join('&').replace(/%20/g, '+');

        const request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE) {
                if (this.status === 200) {
                    const response = JSON.parse(request.responseText);
                    DebugLog("Login response = " + request.responseText);
                    if (response.error) {
                        // There was an error logging in
                        reject(response.error);
                    }
                    else {
                        DebugLog("Successful fetch of user access token");
                        // Successful account access. Token in the returned JSON body.
                        resolve( {
                            'token': response.access_token,
                            'token_type': response.token_type,
                            'scope': response.scope,
                            'refresh_token': response.refresh_token,
                            'accountId': response.account_id
                        } as AuthTokenInfo );
                    };
                }
                else {
                    // Error doing the login
                    reject("Account login failed");
                }
            }
        };
        DebugLog("Starting fetch of user access token for user " + pUsername);
        request.open("POST", ServerURL() + API_ACCOUNT_LOGIN);
        request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        request.send(queryData);
    });
};
// Return a Promise that returns an access token for a domain
function GetDomainToken(pAccountTokenInfo: AuthTokenInfo): Promise<AuthToken> {
    return new Promise( (resolve, reject) => {
        const request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE) {
                if (this.status === 200) {
                    const response = JSON.parse(request.responseText);
                    if (response.status && response.status === 'success') {
                        // Successful fetch of new domain token using account token
                        DebugLog('Successful fetch of domain token');
                        resolve(response.data.domain_token as AuthToken);
                    }
                    else {
                        reject('Fetch of domain token failed: ' + JSON.stringify(response));
                    }
                }
                else {
                    reject('Domain token fetch failed');
                }
            }
        };
        DebugLog('Starting fetch of domain token');
        request.open('GET', ServerURL() + API_GET_TOKEN + "?scope=domain");
        request.setRequestHeader('Authorization',
                        pAccountTokenInfo.token_type + ' ' + pAccountTokenInfo.token);
        request.send();
    });
};
// Create a new user account. Does not return anything
function CreateUserAccount(pUsername: string, pPassword: string, pEmail: string): Promise<void> {
    return new Promise( (resolve , reject) => {
        DebugLog('Starting account creation request for ' + pUsername);
        const requestData = JSON.stringify({
            'user': {
                'username': pUsername,
                'password': pPassword,
                'email': pEmail
            }
        });
        const request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE) {
                if (this.status === 200) {
                    const response = JSON.parse(request.responseText);
                    if (response.status && response.status === 'success') {
                        // Successful account creation
                        DebugLog('Successful account creation');
                        resolve();
                    }
                    else {
                        if (response.data || response.error) {
                            reject('Account creation failed: ' + JSON.stringify(response));
                        }
                        else {
                            reject('Account creation failed');
                        };
                    };
                };
            };
        };
        request.open('POST', ServerURL() + API_ACCOUNT_CREATE);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(requestData);
    });
};
async function DoDeleteOp(pAccountTokenInfo: AuthTokenInfo, pURL: string): Promise<void> {
    return new Promise( (resolve , reject) => {
        const request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE) {
                if (this.status === 200) {
                    const response = JSON.parse(request.responseText);
                    if (response.status && response.status === 'success') {
                        // Successful account creation
                        DebugLog('Successful delete');
                        resolve();
                    }
                    else {
                        if (response.data || response.error) {
                            reject('Deletion failed: ' + JSON.stringify(response));
                        }
                        else {
                            reject('Deletion failed');
                        }
                    };
                };
            };
        };
        request.open('DELETE', ServerURL() + pURL);
        request.setRequestHeader('Authorization',
                        pAccountTokenInfo.token_type + ' ' + pAccountTokenInfo.token);
        request.send();
    });
};
async function FetchAccountList(pAsAdmin: boolean): Promise<any[]> {
    return GetDataFromServer(API_GET_ACCOUNTS, 'accounts', pAsAdmin ? 'asAdmin=true' : undefined);
};
async function FetchUserList(pAsAdmin: boolean): Promise<any[]> {
    return GetDataFromServer(API_GET_USERS, 'users', pAsAdmin ? 'asAdmin=true' : undefined);
};
async function FetchDomainList(pAsAdmin: boolean): Promise<any[]> {
    return GetDataFromServer(API_GET_DOMAINS, 'domains', pAsAdmin ? 'asAdmin=true' : undefined);
};
// Return a Promise for a request to the server and return the 'data' that is fetched.
async function FetchTokenList(pAsAdmin: boolean): Promise<any[]> {
    return GetDataFromServer(API_GET_TOKENS, 'tokens', pAsAdmin ? 'asAdmin=true' : undefined);
};
async function FetchPlacesList(pAsAdmin: boolean): Promise<any[]> {
    return GetDataFromServer(API_GET_PLACES, 'places', pAsAdmin ? 'asAdmin=true' : undefined);
};
async function FetchRequestList(pAsAdmin: boolean): Promise<any[]> {
    return GetDataFromServer(API_GET_REQUESTS, 'requests', pAsAdmin ? 'asAdmin=true' : undefined);
};
// Return a Promise for a request to the server and return the 'data' that is fetched.
// If there are any errors, the Promise is rejected with a text error.
// If 'pDataField' is passed, what is returned is 'data[pDataField]' otherwise
//    the whole 'data' structure is returned.
// Note: this also sends the gLoginTokenInfo info in the Authorization header.
async function GetDataFromServer(pBaseUrl: string, pDataField?: string, pQuery?: string): Promise<any[] | any> {
    return new Promise( (resolve, reject) => {
        const request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (this.readyState === XMLHttpRequest.DONE) {
                if (this.status === 200) {
                    const response = JSON.parse(request.responseText);
                    if (response.status && response.status !== 'success') {
                        reject(request.responseText);
                    }
                    else {
                        resolve( pDataField ? response.data[pDataField] : response.data);
                    };
                }
                else {
                    reject(`Failure fetching accounts: response code=${this.status}`);
                };
            };
        };
        const query: string = isNullOrEmpty(pQuery) ? '' : '?' + pQuery ;
        request.open("GET", ServerURL() + pBaseUrl + query);
        request.setRequestHeader('Authorization', `${gLoginTokenInfo.token_type} ${gLoginTokenInfo.token}`);
        request.send();
    });
};
// ===========================================================================
function DisplaySuccessfulLogin(username: string, tokenInfo: AuthTokenInfo): void {
    DebugLog('Login successful for ' + username);
    gLoginUser = username;
    gLoginTokenInfo = tokenInfo;
    SetTextInElement('v-loggedin-username', username);
    SetTextInElement('v-loggedin-authtoken', tokenInfo.token);
    SetTextInElement('v-loggedin-accountid', tokenInfo.accountId);
};
function DisplayDomainToken(domainToken: AuthToken): void {
    gDomainToken = domainToken;
    SetTextInElement('v-domain-token', gDomainToken);
};
function DisplayAccounts() {
    // Column defintions are [columnHeader, fieldInAccount, classForDataEntry]
    const columns = [
        ['id', 'accountId', 'v-id v-acct-id'],
        ['name', 'username', 'v-acct-name'],
        ['email', 'email', 'v-acct-email'],
        ['admin', 'administrator', 'v-acct-admin'],
        ['whenCreated', 'when_account_created', 'v-date v-acct-created']
    ];
    BuildTable(columns, gAccountsInfo, 'v-acct-table');
};
function DisplayUsers() {
    // Column defintions are [columnHeader, fieldInAccount, classForDataEntry]
    const columns = [
        ['id', 'accountId', 'v-id v-acct-id'],
        ['name', 'username', 'v-acct-name']
    ];
    BuildTable(columns, gUsersInfo, 'v-acct-table');
};
function DisplayDomains() {
    // Column defintions are [columnHeader, fieldInAccount, classForDataEntry]
    const columns = [
        ['id', 'domainId', 'v-id v-dom-id'],
        ['name', 'name', 'v-dom-place'],
        ['sponsor', 'sponsor_account_id', 'v-id v-dom-sponsor'],
        ['version', 'version', 'v-dom-version'],
        ['netaddr', 'network_address', 'v-dom-netaddr'],
        ['users', 'num_users', 'v-dom-users'],
        ['anon', 'anon_users', 'v-dom-anon'],
        ['cap', 'capacity', 'v-dom-capacity'],
        ['desc', 'description', 'v-dom-desc'],
        ['tags', 'tags', 'v-dom-tags'],
        ['last sender', 'last_sender_key', 'v-dom-sender'],
        ['last heartbeat', 'time_of_last_heartbeat', 'v-date v-dom-lasthb'],
        ['created', 'when_domain_entry_created', 'v-date v-dom-created'],
    ];
    BuildTable(columns, gDomainsInfo, 'v-domain-table');
};
function DisplayTokens() {
    // Column defintions are [columnHeader, fieldInAccount, classForDataEntry]
    const columns = [
        ['token', 'token', 'v-id v-tok-id'],
        ['accountId', 'accountId', 'v-id v-tok-account'],
        ['scope', 'scope', 'v-tok-scope'],
        ['creation', 'creation_time', 'v-date v-tok-created'],
        ['expiration', 'expiration_time', 'v-date v-tok-expire']
    ];
    BuildTable(columns, gTokensInfo, 'v-token-table');
};
function DisplayPlaces() {
    // Column defintions are [columnHeader, fieldInAccount, classForDataEntry]
    const columns = [
        ['id', 'placeId', 'v-id v-place-id'],
        ['name', 'name', 'v-id v-place-name'],
        ['address', 'address', 'v-place-address'],
        ['description', 'description', 'v-place-description'],
        ['maturity', 'maturity', 'v-place-maturity'],
        ['tags', 'tags', 'v-place-tags'],
        ['vis', 'visibility', 'v-place-visibility'],
        ['domain', 'domain.id', 'v-id v-place-domain']
    ];
    BuildTable(columns, gPlacesInfo, 'v-places-table');
};
function DisplayRequests() {
    // Column defintions are [columnHeader, fieldInAccount, classForDataEntry]
    const columns = [
        ['id', 'id', 'v-id v-req-id'],
        ['type', 'type', 'v-id v-req-type'],
        ['requestingAcct', 'requesting_account_id', 'v-id v-req-id'],
        ['targetAcct', 'target_account_id', 'v-id v-req-id'],
        ['expiration', 'expiration_time', 'v-date v-req-expire'],
        ['requesterId', 'handshake.requester_id', 'v-id v-req-id'],
        ['accept', 'handshake.requester_accepted', 'v-req-accept'],
        ['targetId', 'handshake.target_id', 'v-id v-req-id'],
        ['accept', 'handshake.target_accepted', 'v-req-accept']
    ];
    BuildTable(columns, gRequestInfo, 'v-places-table');

};
// Build the table with the passed column info into the one table place
function BuildTable(pColumnInfo: string[][], pData: any[], pTableClass: string) {
    const rows = BuildTableRows(pColumnInfo, pData);
    const tablePlace = document.getElementById('v-table-list');
    tablePlace.innerHTML = '';
    tablePlace.appendChild(makeTable(rows, `v-table ${pTableClass} v-info-table`));
};
// Passed an array of entries like [columnHeader, fieldInAccount, classForDataEntry]
// This returns an array of table rows with a header and datarows made from the data
function BuildTableRows(pColumnInfo: string[][], pData: any[]): HTMLElement[] {
    const rows: HTMLElement[] = [];
    // Add row of headers
    rows.push(makeRow(pColumnInfo.map(col => {
        return makeHeader(col[0]);
    }) ) );
    // Add rows for each of the data structures
    if (pData) {
        pData.forEach( info => {
            rows.push( makeRow(pColumnInfo.map( col => {
                const fieldPieces = col[1].split('.');
                let source: any = info;
                fieldPieces.forEach( level => {
                    if (source && source.hasOwnProperty(level)) {
                        source = source[level];
                    }
                    else {
                        source = undefined;
                    };
                });
                // If didn't find anything for the field spec, return a dot
                if (typeof(source) === 'undefined' || source === null) {
                    source = '.';
                };
                try {
                    return makeData(source, col[2]);
                }
                catch (err) {
                    ErrorLog(`BuildTableRows: makeData exception for ${col[1]}: ${err}`);
                };
                // default cell contents if there were bad errors above
                return makeData(',', col[2]);
            })));
        });
    };
    return rows;
};

function makeTable(contents: any, aClass?: string): HTMLElement {
    return makeElement('table', contents, aClass);
};
function makeRow(contents: any, aClass?: string): HTMLElement {
    return makeElement('tr', contents, aClass);
};
function makeHeader(contents: any, aClass?: string): HTMLElement {
    return makeElement('th', contents, aClass);
};
function makeData(contents: any, aClass?: string): HTMLElement {
    return makeElement('td', contents, aClass);
};
function makeDiv(contents: any, aClass?: string): HTMLElement {
    return makeElement('div', contents, aClass);
};
function makeSpan(contents: any, aClass?: string): HTMLElement {
    return makeElement('span', contents, aClass);
};
function makeImage(src: string, aClass?: string): HTMLElement {
    const img = makeElement('img', undefined, aClass);
    img.setAttribute('src', src);
    return img;
};
function makeText(contents: string): Text {
    return document.createTextNode(contents);
};
// Make a DOM element of 'type'.
// If 'contents' is:
//       undefined: don't add any contents to the created element
//       an array: append multiple children
//       a string: append a DOM text element containing the string
//       otherwise: append 'contents' as a child
// If 'aClass' is defined, add a 'class' attribute to the created DOM element
function makeElement(type: string, contents?: any, aClass?: string): HTMLElement {
    const elem = document.createElement(type);
    if (aClass) {
        elem.setAttribute('class', aClass);
    }
    if (typeof(contents) !== 'undefined' && contents !== null) {
        if (Array.isArray(contents)) {
            contents.forEach(ent => {
                if (typeof(ent) !== 'undefined') {
                    elem.appendChild(makeChild(ent));
                };
            });
        }
        else {
            elem.appendChild(makeChild(contents));
        };
    };
    return elem;
};
function makeChild(pContents: any): HTMLElement {
    let ret = pContents;
    switch ( typeof(pContents) ) {
        case 'string': ret = makeText(pContents); break;
        case 'number': ret = makeText(pContents.toString()); break;
        case 'boolean': ret = makeText(pContents.toString()); break;
        case 'undefined': ret = makeText('undefined'); break;
        default: break;
    }
    return ret;
}
function isNullOrEmpty(pThing: any): boolean {
    return typeof(pThing) === 'undefined'
            || pThing === null
            || ( typeof(pThing) === 'string' && (pThing as string).length === 0 ) ;
}
function isNotNullOrEmpty(pThing: any): boolean {
    return ! isNullOrEmpty(pThing);
}

// vim: set tabstop=4 shiftwidth=4 autoindent expandtab