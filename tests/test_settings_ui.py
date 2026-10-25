# -*- coding: utf-8 -*-
#
# Copyright (C) 2026 CERN.
#
# Invenio-Github is free software; you can redistribute it and/or modify it
# under the terms of the MIT License; see LICENSE file for more details.
"""Test the GitHub settings page markup that the frontend relies on."""

import pytest
from flask import Blueprint
from invenio_accounts.testutils import login_user_via_session
from invenio_app.factory import create_ui
from invenio_db import db

from invenio_github.api import GitHubAPI

# The settings page is served by the UI application (see pytest-invenio base_app).
create_app = create_ui


class _NoAssetsManifest:
    """Render no script/style tags: webpack assets are not built in tests."""

    def __getitem__(self, entry):
        return ""

    def __getattr__(self, entry):
        return ""


class _NoAssetsManifestLoader:
    def load(self, filepath):
        return _NoAssetsManifest()


@pytest.fixture(scope="module")
def app_config(app_config):
    """Render the semantic-ui settings templates without built assets."""
    app_config["APP_THEME"] = ["semantic-ui"]
    app_config["WEBPACKEXT_MANIFEST_LOADER"] = _NoAssetsManifestLoader
    return app_config


@pytest.fixture(scope="module")
def app(app):
    """Stand in for the invenio-formatter badges blueprint.

    The real one needs ``cairosvg``, which is not a test dependency; the page only
    needs its URL rule and its macro templates.
    """
    badges = Blueprint(
        "invenio_formatter_badges", "invenio_formatter", template_folder="templates"
    )
    badges.add_url_rule(
        "/badge/<title>/<path:value>.<ext>", "badge", lambda **kwargs: ""
    )
    app.register_blueprint(badges)
    return app


def _render_settings_page(client, user):
    login_user_via_session(client, email=user.email)
    res = client.get("/account/settings/github/")
    assert res.status_code == 200
    return res.get_data(as_text=True)


def test_settings_page_renders_refresh_markers(app, client, github_api, test_user):
    """The lists container and the last sync text have stable ids."""
    api = GitHubAPI(test_user.id)
    api.init_account()
    api.sync()
    db.session.commit()

    html = _render_settings_page(client, test_user)

    assert 'id="github-repositories"' in html
    assert 'id="sync_repos_help_text"' in html


def test_settings_page_splits_repositories_by_hook(app, client, github_api, test_user):
    """An enabled repository is listed under "Enabled Repositories" only."""
    api = GitHubAPI(test_user.id)
    api.init_account()
    api.sync()
    api.create_hook(1, "auser/repo-1")
    db.session.commit()

    html = _render_settings_page(client, test_user)

    lists_start = html.index('id="github-repositories"')
    enabled_start = html.index('aria-label="Enabled Repositories"')
    disabled_start = html.index('aria-label="Repositories"')
    assert lists_start < enabled_start < disabled_start

    enabled_section = html[enabled_start:disabled_start]
    disabled_section = html[disabled_start:]
    assert "auser/repo-1" in enabled_section
    assert "auser/repo-1" not in disabled_section
    assert "auser/repo-2" in disabled_section
    assert "auser/arepo" in disabled_section
