/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2019 Marc Ruiz Altisent. All rights reserved.
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

function onLoad() {
  window.removeEventListener("DOMContentLoaded", onLoad);
  document.getElementById("replace").addEventListener("click", showReplaceBar);
  document.getElementById("replaceWithList").addEventListener("click", replaceWithList);
  document.getElementById("autoReplaceOnLoad").addEventListener("click", toggleAutoReplaceOnLoad);
  document.getElementById("options").addEventListener("click", showOptions);
  document.getElementById('help').addEventListener('click', showHelp);

  storage.getPrefs().then(prefs => {
    const checkIcon = document.getElementById("autoReplaceOnLoadCheck");
    const iconDiv = checkIcon.parentElement;
    if (prefs.autoReplaceOnLoad) {
      checkIcon.classList.add("fa-check");
      iconDiv.style.display = "block";
    } else {
      checkIcon.classList.remove("fa-check");
      iconDiv.style.display = "none";
    }
  });

  Promise.all([chrome.commands.getAll(), chrome.runtime.getPlatformInfo()]).then(([commands, info]) => {
    for (let command of commands) {
      let elementId;
      switch (command.name) {
        case "apply-substitution-list": elementId = "replaceWithListShortcut"; break;
      }
      if (elementId && document.getElementById(elementId) && command.shortcut) {
        let shortcut = command.shortcut;
        if (info.os == "mac") shortcut = shortcut.replace("Ctrl", chrome.i18n.getMessage("keys_cmd"));
        shortcut = shortcut.replace("Ctrl", chrome.i18n.getMessage("keys_ctrl"));
        shortcut = shortcut.replace("Shift", chrome.i18n.getMessage("keys_shift"));
        document.getElementById(elementId).textContent = shortcut;
      }
    }
  }).catch(() => {
    // Ignore errors if commands API fails
  });
}

function onUnload() {
  window.removeEventListener("unload", onUnload);
  document.getElementById("replace").removeEventListener("click", showReplaceBar);
  document.getElementById("replaceWithList").removeEventListener("click", replaceWithList);
  document.getElementById("autoReplaceOnLoad").removeEventListener("click", toggleAutoReplaceOnLoad);
  document.getElementById("options").removeEventListener("click", showOptions);
  document.getElementById('help').removeEventListener('click', showHelp);
}

function showReplaceBar() {
  chrome.tabs.create({url: 'sidebar/sidebar.html'})
    .then(() => window.close());
}

function replaceWithList() {
  chrome.runtime.sendMessage({ key: "replaceWithList" })
    .then(() => window.close());
}

function toggleAutoReplaceOnLoad() {
  storage.getPrefs().then(prefs => {
    storage.setPrefs({
      autoReplaceOnLoad: !prefs.autoReplaceOnLoad
    }).then(() => window.close());
  });
}

function showOptions() {
  chrome.runtime.openOptionsPage()
    .then(() => window.close());
}

function showHelp() {
  chrome.tabs.create({
    url: 'https://github.com/Woundorf/foxreplace/wiki/FAQ'
  }).then(() => window.close());
}

window.addEventListener("DOMContentLoaded", onLoad);
window.addEventListener("unload", onUnload);
