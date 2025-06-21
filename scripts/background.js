/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2022 Marc Ruiz Altisent. All rights reserved.
 *
 *  This file is part of FoxReplace.
 *
 *  FoxReplace is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software
 *  Foundation, either version 3 of the License, or (at your option) any later version.
 *
 *  FoxReplace is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 *  A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along with FoxReplace. If not, see <http://www.gnu.org/licenses/>.
 *
 *  ***** END LICENSE BLOCK ***** */

// Minimal storage object
const storage = {
  getPrefs() {
    return chrome.storage.local.get({
      enableContextMenu: false,
      autoReplaceOnLoad: false,
      autoReplacePeriodically: false,
      autoReplacePeriod: 1,
      enableSubscription: false,
      subscriptionUrl: "",
      subscriptionPeriod: 1
    });
  },
  setPrefs(prefs) {
    return chrome.storage.local.set(prefs);
  }
};

// Minimal periodic replace
const periodicReplace = {
  alarmName: "periodicReplace",
  start(period) {
    return chrome.alarms.get(this.alarmName).then(alarm => {
      if (alarm) return;
      chrome.alarms.create(this.alarmName, {
        when: Date.now() + 100,
        periodInMinutes: period / 60
      });
    });
  },
  restart(period) {
    this.stop().then(() => this.start(period));
  },
  stop() {
    return chrome.alarms.clear(this.alarmName);
  }
};

// Minimal subscription
const subscription = {
  start() { return Promise.resolve(); },
  restart() { return Promise.resolve(); },
  stop() { return Promise.resolve(); }
};

// Listen to messages from other parts of the WebExtension
chrome.runtime.onMessage.addListener(message => {
  switch (message.key) {
    case "replace":
    case "replaceWithList":
      replaceCurrentTab(message);
      break;
  }
});

/**
 * Applies the substitution list contained in aMessage to the current tab.
 */
function replaceCurrentTab(aMessage) {
  const options = { active: true };
  if (aMessage.key != 'replaceWithListPeriod') options.currentWindow = true;    // limit to current window except for periodic substitutions

  chrome.tabs.query(options).then(tabs => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, aMessage).catch(() => {
        // Ignore connection errors - tab may not have content script
      });
    }
  });
}

// Initialize things
storage.getPrefs().then(prefs => {
  if (prefs.enableContextMenu) createContextMenu();

  if (prefs.enableSubscription) subscription.start(prefs.subscriptionUrl, prefs.subscriptionPeriod);

  if (prefs.autoReplacePeriodically) periodicReplace.start(prefs.autoReplacePeriod);

  createToolsMenu(prefs.autoReplaceOnLoad);
});

// Update things
chrome.storage.onChanged.addListener(changes => {
  storage.getPrefs().then(prefs => {
    if (changes.enableContextMenu && changes.enableContextMenu.newValue != changes.enableContextMenu.oldValue) {
      if (prefs.enableContextMenu) createContextMenu();
      else chrome.contextMenus.remove("context.apply-substitution-list");
    }

    if (changes.enableSubscription && changes.enableSubscription.newValue != changes.enableSubscription.oldValue) {
      if (prefs.enableSubscription) subscription.restart(prefs.subscriptionUrl, prefs.subscriptionPeriod);
      else subscription.stop();
    }

    if (changes.autoReplacePeriodically && changes.autoReplacePeriodically.newValue != changes.autoReplacePeriodically.oldValue) {
      if (prefs.autoReplacePeriodically) periodicReplace.restart(prefs.autoReplacePeriod);
      else periodicReplace.stop();
    }

    if (changes.autoReplaceOnLoad && changes.autoReplaceOnLoad.newValue != changes.autoReplaceOnLoad.oldValue) {
      chrome.contextMenus.update("tools.auto-replace-on-load", { checked: prefs.autoReplaceOnLoad });
    }
  });
});

// Listen for periodic replace alarm
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name == periodicReplace.alarmName) {
    replaceCurrentTab({ key: "replaceWithListPeriod"});
  }
});

chrome.commands.onCommand.addListener(name => {
  switch (name) {
    case "apply-substitution-list":
      replaceCurrentTab({ key: "replaceWithList" });
      break;
  }
});

let menusCreated = false;

function createContextMenu() {
  if (menusCreated) return;
  chrome.contextMenus.create({
    id: "context.apply-substitution-list",
    title: chrome.i18n.getMessage("menu_replaceWithList"),
    contexts: ["all"]
  });
}

function createToolsMenu(autoReplaceOnLoad) {
  if (menusCreated) return;
  chrome.contextMenus.create({
    id: "tools.replace",
    title: chrome.i18n.getMessage("menu_replace"),
    contexts: ["all"]
  });
  chrome.contextMenus.create({
    id: "tools.apply-substitution-list",
    title: chrome.i18n.getMessage("menu_replaceWithList"),
    contexts: ["all"]
  });
  chrome.contextMenus.create({
    id: "tools.auto-replace-on-load",
    type: "checkbox",
    title: chrome.i18n.getMessage("menu_autoReplaceOnLoad"),
    contexts: ["all"],
    checked: autoReplaceOnLoad
  });
  chrome.contextMenus.create({
    id: "tools.options",
    title: chrome.i18n.getMessage("menu_options"),
    contexts: ["all"]
  });
  chrome.contextMenus.create({
    id: 'tools.help',
    title: chrome.i18n.getMessage('menu_help'),
    contexts: ['all']
  });
  menusCreated = true;
}

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId == "tools.replace") {
    chrome.tabs.create({url: 'sidebar/sidebar.html'});
  }
  else if (info.menuItemId == "context.apply-substitution-list" || info.menuItemId == "tools.apply-substitution-list") {
    replaceCurrentTab({ key: "replaceWithList" });
  }
  else if (info.menuItemId == "tools.auto-replace-on-load") {
    storage.setPrefs({ autoReplaceOnLoad: info.checked });
  }
  else if (info.menuItemId == "tools.options") {
    chrome.runtime.openOptionsPage();
  }
  else if (info.menuItemId == 'tools.help') {
     chrome.tabs.create({
      url: 'https://github.com/Woundorf/foxreplace/wiki/FAQ'
    });
  }
});