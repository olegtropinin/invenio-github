// This file is part of InvenioGithub
// Copyright (C) 2023-2026 CERN.
//
// Invenio Github is free software; you can redistribute it and/or modify it
// under the terms of the MIT License; see LICENSE file for more details.
import $ from "jquery";

function addResultMessage(element, color, icon, message) {
  element.classList.remove("hidden", "positive", "negative", "warning");
  element.classList.add(color);
  element.querySelector(`.icon`).className = `${icon} small icon`;
  element.querySelector(".content").textContent = message;
}

function hideAfter(element, delay) {
  setTimeout(function () {
    element.classList.add("hidden");
  }, delay);
}

// function from https://www.w3schools.com/js/js_cookies.asp
function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

const REQUEST_HEADERS = {
  "Content-Type": "application/json",
  "X-CSRFToken": getCookie("csrftoken"),
};

// Ids rendered by settings/index.html and settings/helpers.html.
const REPOSITORIES_ID = "github-repositories";
const LAST_SYNC_ID = "sync_repos_help_text";

function initDoiBadgeModals(container) {
  $(container)
    .find(".doi-badge-modal")
    .modal({
      selector: {
        close: ".close.button",
      },
      onShow: function () {
        const modalId = $(this).attr("id");
        $(`#${modalId}-trigger`).attr("aria-expanded", true);
      },
      onHide: function () {
        const modalId = $(this).attr("id");
        $(`#${modalId}-trigger`).attr("aria-expanded", false);
      },
    });
}

/**
 * Re-render the repository lists and the last sync time from the server.
 *
 * Resolves to false when the page cannot be refreshed in place, e.g. when it
 * was rendered by templates without the refresh ids, or when the session
 * expired. Callers then ask the user to reload the page instead.
 */
async function refreshRepositoryLists() {
  const lists = document.getElementById(REPOSITORIES_ID);
  if (!lists) {
    return false;
  }

  let page;
  try {
    const response = await fetch(window.location.href, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) {
      return false;
    }
    page = new DOMParser().parseFromString(await response.text(), "text/html");
  } catch (error) {
    return false;
  }

  const freshLists = page.getElementById(REPOSITORIES_ID);
  if (!freshLists) {
    return false;
  }

  // Initialised modals live in the page dimmer, outside of the lists; remove
  // them so that their re-rendered copies do not duplicate their ids.
  $(".doi-badge-modal").remove();
  lists.innerHTML = freshLists.innerHTML;
  initDoiBadgeModals(lists);

  const lastSync = document.getElementById(LAST_SYNC_ID);
  const freshLastSync = page.getElementById(LAST_SYNC_ID);
  if (lastSync && freshLastSync) {
    lastSync.innerHTML = freshLastSync.innerHTML;
  }
  return true;
}

function fetchWithTimeout(url, options, timeout = 100000) {
  /** Timeout set to 100000 ms = 1m40s .*/
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeout)
    ),
  ]);
}

const syncButton = document.getElementById("sync_repos");
if (syncButton) {
  syncButton.addEventListener("click", function () {
    const resultMessage = document.getElementById("sync-result-message");
    const loaderIcon = document.getElementById("loader_icon");
    const buttonTextElem = document.getElementById("sync_repos_btn_text");
    const buttonText = buttonTextElem.innerHTML;
    const loadingText = syncButton.dataset.loadingText;

    buttonTextElem.innerHTML = loadingText;
    loaderIcon.classList.add("loading");

    syncRepos();

    async function syncRepos() {
      try {
        const response = await fetchWithTimeout(
          "/api/user/github/repositories/sync",
          { method: "POST", headers: REQUEST_HEADERS }
        );
        if (response.ok) {
          const refreshed = await refreshRepositoryLists();
          addResultMessage(
            resultMessage,
            "positive",
            "checkmark",
            refreshed
              ? "Repositories synced successfully."
              : "Repositories synced successfully. Some items may still be updating, please reload the page in about a minute."
          );
        } else {
          addResultMessage(
            resultMessage,
            "negative",
            "cancel",
            `Request failed with status code: ${response.status}`
          );
        }
        hideAfter(resultMessage, 10000);
      } catch (error) {
        if (error.message === "timeout") {
          addResultMessage(
            resultMessage,
            "warning",
            "hourglass",
            "This action seems to take some time, refresh the page after several minutes to inspect the synchronisation."
          );
        } else {
          addResultMessage(
            resultMessage,
            "negative",
            "cancel",
            `There has been a problem: ${error}`
          );
          hideAfter(resultMessage, 7000);
        }
      } finally {
        loaderIcon.classList.remove("loading");
        buttonTextElem.innerHTML = buttonText;
      }
    }
  });
}

const repositories = document.getElementsByClassName("repository-item");
if (repositories) {
  for (const repo of repositories) {
    repo.addEventListener("change", function (event) {
      sendEnableDisableRequest(event.target.checked, repo);
    });
  }
}

function sendEnableDisableRequest(checked, repo) {
  const repoId = repo
    .querySelector("input[data-repo-id]")
    .getAttribute("data-repo-id");
  const switchMessage = repo.querySelector(".repo-switch-message");
  const action = checked ? "enable" : "disable";
  const url = `/api/user/github/repositories/${repoId}/${action}`;

  sendRequest();

  async function sendRequest() {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: REQUEST_HEADERS,
      });
      if (response.ok) {
        addResultMessage(
          switchMessage,
          "positive",
          "checkmark",
          "Repository synced successfully. Please reload the page."
        );
        hideAfter(switchMessage, 10000);
      } else {
        addResultMessage(
          switchMessage,
          "negative",
          "cancel",
          `Request failed with status code: ${response.status}`
        );
        hideAfter(switchMessage, 5000);
      }
    } catch (error) {
      addResultMessage(
        switchMessage,
        "negative",
        "cancel",
        `There has been a problem: ${error}`
      );
      hideAfter(switchMessage, 7000);
    }
  }
}

// DOI badge modal
initDoiBadgeModals(document);

function showDoiBadgeModal(trigger) {
  const modalId = $(trigger).attr("aria-controls");
  $(`#${modalId}.doi-badge-modal`).modal("show");
}

// Delegated, so that badges keep working after the lists are re-rendered.
$(document).on("click", ".doi-modal-trigger", function (event) {
  showDoiBadgeModal(event.target);
});

$(document).on("keydown", ".doi-modal-trigger", function (event) {
  if (event.key === "Enter") {
    showDoiBadgeModal(event.target);
  }
});

// ON OFF toggle a11y
function updateToggleAriaLabel(toggle) {
  const $toggle = $(toggle);
  const label = toggle.checked
    ? $toggle.data("checked-aria-label")
    : $toggle.data("unchecked-aria-label");
  $toggle.attr("aria-label", label);
}

$(document).on("change", ".toggle.on-off input", function (event) {
  updateToggleAriaLabel(event.target);
});
