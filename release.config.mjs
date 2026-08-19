/**
 * One configuration, two runs with different jobs to do.
 *
 * The `version` job runs `semantic-release --dry-run` purely to learn the next
 * version, because UI_VERSION is compiled into the web UI and therefore has to
 * exist before the builds start. It loads no plugin that writes: working out a
 * number needs none of them, and the run is faster and has fewer ways to fail.
 *
 * Both jobs still need `contents: write`, including that one. `verifyAuth` sits
 * in semantic-release's core and runs a real `git push --dry-run HEAD:main`
 * before any plugin loads, regardless of --dry-run, failing the whole run with
 * EGITNOPERMISSION otherwise. A dry-run push is not evaluated against branch
 * rules, which is why that succeeds on a protected branch while a real one does
 * not.
 *
 * **Nothing here commits to `main`.** @semantic-release/git would, and it cannot:
 * main carries `pull_request` and `required_status_checks` rulesets, and
 * github-actions[bot] can be exempted from neither -- not as an `Integration`,
 * because GitHub's own Actions app is not installed in the organisation, and not
 * as a `User` either, which the API accepts but which does not match the actor
 * GitHub sees on a bot push. So the release is a tag plus a GitHub release, both
 * of which work: tags are outside those rulesets entirely (`target: branch`).
 *
 * The cost is that CHANGELOG.md is not kept in the tree and the decorative
 * version in pyproject.toml is not updated; the release notes live on the
 * GitHub release instead. Restoring either means a GitHub App, which *can* be a
 * bypass actor -- then add @semantic-release/changelog and /git back here.
 *
 * Note the single quotes throughout: `${nextRelease.version}` is a
 * semantic-release template, and a JS template literal would eat it here.
 */
const publishing = process.env.SEMANTIC_RELEASE_PUBLISH === 'true'

/** Only ever the GitHub release; see above for why nothing writes to the tree. */
const publishingPlugins = [
  ['@semantic-release/github', { assets: [{ path: 'release-assets/*' }] }],
]

export default {
  branches: ['main'],
  // Matches the tags that existed before this was automated, and the value the
  // update bundle records -- the running UI compares itself against it.
  tagFormat: 'v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/exec',
      {
        // exec renders commands as Lodash templates, so `${...}` is replaced
        // before any shell sees it: a shell default like
        // `${GITHUB_OUTPUT:-/dev/null}` dies with `SyntaxError: Unexpected
        // token ':'`. Writing a file instead keeps the two apart, and lets the
        // value be inspected outside Actions.
        verifyReleaseCmd:
          "printf 'published=true\\ntag=%s\\nversion=%s\\n' '${nextRelease.gitTag}' '${nextRelease.version}' > .release-version",
      },
    ],
    ...(publishing ? publishingPlugins : []),
  ],
}
