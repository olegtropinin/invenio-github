// This file is part of InvenioGithub
// Copyright (C) 2026 CERN.
//
// Invenio Github is free software; you can redistribute it and/or modify it
// under the terms of the MIT License; see LICENSE file for more details.

// Markup mirrors templates/semantic-ui/invenio_github/settings/{index,helpers,index_item}.html.
function repositoryItem({ id, name, enabled }) {
  return `
    <li class="ui segment">
      <div class="ui grid repository-item">
        <a href="/account/settings/github/repository/${name}"><b>${name}</b></a>
        <div class="repo-switch-message ui message hidden">
          <i class="icon"></i><p role="alert" class="content"></p>
        </div>
        <div class="ui toggle on-off checkbox">
          <input type="checkbox" ${
            enabled ? "checked" : ""
          } data-repo-id="${id}"
            data-checked-aria-label="Disable ${name}" data-unchecked-aria-label="Enable ${name}"
            aria-label="${enabled ? "disable" : "enable"} ${name}" />
          <label></label>
        </div>
      </div>
    </li>`;
}

function repositoryLists(repositories) {
  const enabled = repositories.filter((repo) => repo.enabled);
  const disabled = repositories.filter((repo) => !repo.enabled);
  return `
    <section aria-label="Enabled Repositories"><ul>${enabled
      .map(repositoryItem)
      .join("")}</ul></section>
    <section aria-label="Repositories"><ul>${disabled
      .map(repositoryItem)
      .join("")}</ul></section>`;
}

function settingsPage({
  repositories,
  lastSync = "(updated an hour ago)",
  markers = true,
}) {
  const lists = repositoryLists(repositories);
  return `
    <section id="github-view">
      <p ${
        markers ? 'id="sync_repos_help_text"' : ""
      }><small>${lastSync}</small></p>
      <button id="sync_repos" data-loading-text="Syncing">
        <i id="loader_icon" class="sync alternate icon"></i>
        <span id="sync_repos_btn_text">Sync now</span>
      </button>
      <div id="sync-result-message" class="ui message hidden">
        <i class="icon"></i><p role="alert" class="content"></p>
      </div>
    </section>
    ${markers ? `<div id="github-repositories">${lists}</div>` : lists}`;
}

function statusResponse(status) {
  return { ok: status < 400, status, text: () => Promise.resolve("") };
}

// The module wires its handlers on import, so every test loads a fresh copy.
function loadModule() {
  jest.isolateModules(() => {
    const $ = require("jquery");
    $.fn.modal = jest.fn().mockReturnThis();
    require("./index");
  });
}

// Lets the awaited fetch/text promises inside the handlers settle.
function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const REPOS = [
  { id: 1, name: "auser/arepo", enabled: false },
  { id: 2, name: "auser/repo-1", enabled: true },
];

beforeEach(() => {
  global.fetch = jest.fn();
  // jsdom has no Fetch API classes.
  global.Request = class {
    constructor(url, init) {
      Object.assign(this, init, { url });
    }
  };
});

describe("sync", () => {
  it("reports success after the sync request", async () => {
    document.body.innerHTML = settingsPage({ repositories: REPOS });
    global.fetch.mockResolvedValueOnce(statusResponse(200));
    loadModule();

    document.getElementById("sync_repos").click();
    await flushPromises();

    const message = document.querySelector("#sync-result-message .content");
    expect(message.textContent).toMatch(/synced successfully/);
  });
});
