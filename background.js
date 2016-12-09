/* global chrome */

let injected = false;

chrome.browserAction.onClicked.addListener(function(tab) {
    if (!injected) {
        chrome.tabs.executeScript(tab.id, {file: "sparql-it.js"}, () => injected = true);
    }
});
