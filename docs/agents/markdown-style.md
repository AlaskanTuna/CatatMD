# Markdown Style

How every Markdown file in the repository is written. The README has stricter rules of its own, at the end.

## General

- **Title Case** for headings, subheadings, labels, bullet lead-ins and table headers. Full sentences and commit subjects stay in sentence case.
- **No em dashes and no emoji** in prose. `.claude/hooks/no-em-dash-or-emoji.mjs` rejects an edit that adds either. Use a comma, a colon or parentheses.
- **Short blocks.** A paragraph past about 4 lines becomes a list, a table or short subsections.
- **Docs say what is true now.** A doc states how the system works and what is decided. Progress, to-dos and open questions live in issues and pull requests; history lives in git.
- **Forward-looking only.** Apply these rules to what you write or touch. Do not sweep existing docs to conform: a repo-wide retitle buries real changes in noise.
- **Relative links.** Link to other files by relative path, so links work on GitHub and in a clone.

## README Versus TRD

`README.md` and `docs/TRD.md` may both describe architecture. They differ in depth and audience, not in subject.

|              | `README.md`                                                               | `docs/TRD.md`                                                            |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Audience** | Anyone landing on the repository: reviewers, recruiters, collaborators    | Developers implementing against it                                       |
| **Depth**    | The what, how and why, at a glance                                        | The canonical implementation-level reference                             |
| **Contains** | Overview, diagrams of notable components, setup, constraints, limitations | API contracts, data models, schemas, pipeline detail, decision rationale |
| **Rule**     | Anything an outside reader needs to understand the system lives here      | Never repeat the README's narrative; go deeper instead                   |

## README Density

The README is scanned, not studied. A reader decides what to read from headings, tables and bold lead-ins.

- **No prose block over four lines.** Split on the seam between the claim and its justification: the claim leads, the reasoning follows.
- **Three or more bolded-lead-in paragraphs in a row are a table:** claim in one column, how it is enforced in the other.
- **An enumeration inside a sentence is a list.** A sentence naming three or more vendors, fields, states or controls belongs in bullets or a table. Semicolons separating items are the tell.
- **One idea per block.** A paragraph that states a rule, justifies it and cites a section is three blocks.
- **Reformatting is lossless.** Trim what is not load-bearing, but never drop a measured figure, a citation, a section reference or a limitation. Verify by grepping the claims out of the old version and into the new.

## README Navigation

- **A back-to-top link at the foot of each `##` section,** right-aligned, pointing at the `readme-top` anchor on the first line: `<p align="right"><a href="#readme-top">&uarr;</a></p>`.
- **An explicit `<a id="..."></a>` above any heading that is linked to.** GitHub's generated slugs are unpredictable around emoji and punctuation, and a reader who clicks a broken anchor once does not try again.
