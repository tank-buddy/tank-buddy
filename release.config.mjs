/**
 * One configuration, two runs with different jobs to do.
 *
 * The `version` job runs `semantic-release --dry-run` purely to learn the next
 * version, because UI_VERSION is compiled into the web UI and therefore has to
 * exist before the builds start. That job has no business writing anything, and
 * holds `contents: read`.
 *
 * But @semantic-release/git verifies its access with a real
 * `git push --dry-run` during `verifyConditions` -- before any commit is
 * analysed, and regardless of semantic-release's own dry-run flag. A read-only
 * job therefore dies with EGITNOPERMISSION and no version is ever worked out.
 * @semantic-release/github checks its token the same way.
 *
 * So the plugins that write are only added for the publishing run. Working out
 * a version number needs none of them, and the read-only job stays read-only.
 *
 * Note the single quotes throughout: `${nextRelease.version}` is a
 * semantic-release template, and a JS template literal would eat it here.
 */
const publishing = process.env.SEMANTIC_RELEASE_PUBLISH === 'true'

/** Everything that needs `contents: write`, and nothing that does not. */
const publishingPlugins = [
  ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
  [
    '@semantic-release/git',
    {
      assets: ['CHANGELOG.md', 'pyproject.toml'],
      message: 'chore(release): ${nextRelease.gitTag} [skip ci]',
    },
  ],
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
        // Only ever runs in the publishing job: --dry-run stops before prepare.
        prepareCmd:
          'uv run python tools/set_project_version.py pyproject.toml ${nextRelease.version}',
      },
    ],
    ...(publishing ? publishingPlugins : []),
  ],
}
