# Evidence for inveniosoftware/invenio-github#216

This branch only holds screenshots for the PR; it is not meant to be merged.

Captured with Playwright against `fix/github-settings-live-refresh` at `c16cf20`
(the PR head). The served JS bundle was rebuilt from that commit and compared byte for byte.

Setup: the real views, templates and REST API of invenio-github in a local invenio-app,
sqlite, Redis sessions, an in-memory fake GitHub, and Semantic UI 2.5 from a CDN instead of
the built Zenodo theme (hence the unstyled header and the missing logo).

| File | Shows |
|---|---|
| `img/01-initial.png` | Starting state: 3 enabled (one managed by another user), 3 in Repositories |
| `img/02-after-sync.png` | After Sync, with no reload: `new-tool` added, `climate-model` renamed to `climate-model-v2`, `notebooks` gone, "(updated just now)" |
| `img/03-enabled-moved.png` | `astro-pipeline` enabled: moved to Enabled Repositories in sorted order, focus on its switch |
| `img/04-keyboard-disabled.png` | Space on a focused switch: `zenodo-demo` moved to Repositories, focus kept on it |
| `img/05-refused-reverted.png` | Enable refused with 400: the switch is reverted, the repository stays, the error is shown next to it |
| `img/06-in-flight-disabled.png` | During a request (2 s delay) every switch and Sync are disabled |
| `img/07-final.png` | After the whole series of actions: the live lists equal a reload |
| `img/08-deploy-order.png` | New JS on old templates, and old JS on new templates: today's behaviour ("please reload the page"). Both runs produced the same image |
| `img/run.gif`, `img/run.mp4` | Recording of the run on the new code |
| `results.json` | The 16 Playwright checks and their results |

Not shown: DOI badge modals after a refresh (the local app has no releases; covered by a
JS test only), the Zenodo theme, the real GitHub API.
