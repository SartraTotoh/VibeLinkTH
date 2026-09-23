const fs = require('fs');
const path = process.argv[2];
const js = fs.readFileSync(path + '/js/app.js', 'utf8');
const html = fs.readFileSync(path + '/index.html', 'utf8');

const jsChecks = [
  'SCP_AUTH_BRIDGE_URL', 'scpStartWorkspaceLogin', 'scpConsumeWorkspaceSession',
  'scpParseSessionUser', 'Api.call', 'submitRequestForm', 'LocalDataServer',
  'PortalSync.load', 'openNewRequestModal', 'channelPickerHtml',
  'syncDynamicRequestForm', 'artworkRuleForAsset', 'function boot', 'mapCloudSnapshotJson'
];
const missJs = jsChecks.filter(c => !js.includes(c));
console.log(missJs.length ? 'JS MISSING: ' + missJs.join(', ') : 'JS: all core functions present');

const htmlIds = ['bootGate', 'app', 'modal', 'requestsTable', 'requestsEmpty', 'newRequestBtn', 'newRequestBtn2', 'langToggle', 'userChip', 'syncPill', 'page-dashboard', 'page-requests'];
const missHtml = htmlIds.filter(id => !html.includes('id="' + id + '"'));
console.log(missHtml.length ? 'HTML MISSING ids: ' + missHtml.join(', ') : 'HTML: all ids present');

const closers = (html.match(/<button/g) || []).length - (html.match(/<\/button>/g) || []).length;
console.log('button open/close diff:', closers, closers === 0 ? '(balanced)' : '(UNBALANCED!)');

const totalBacktick = (js.match(/`/g) || []).length;
console.log('js template literals:', totalBacktick, totalBacktick % 2 === 0 ? '(paired)' : '(UNPAIRED — SYNTAX RISK)');