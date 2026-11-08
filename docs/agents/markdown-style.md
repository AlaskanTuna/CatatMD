# Markdown Style

How every Markdown file in the repository is written. The README has stricter rules of its own, at the end.

## General

- **Title Case** for headings, subheadings, labels, bullet lead-ins and table headers. Full sentences and commit subjects stay in sentence case.
- **No Em Dashes And No Emoji** in prose. `.claude/hooks/no-em-dash-or-emoji.mjs` rejects an edit that adds either. Use a comma, a colon or parentheses.
- **Short Blocks.** A paragraph past about 4 lines becomes a list, a table or short subsections.
- **Docs Say What Is True Now.** A doc states how the system works and what is decided. Progress, to-dos and open questions live in issues and pull requests; history lives in git.
- **Forward-Looking Only.** Apply these rules to what you write or touch. Do not sweep existing docs to conform: a repo-wide retitle buries real changes in noise.
- **Relative Links.** Link to other files by relative path, so links work on GitHub and in a clone.

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

- **No Prose Block Over Four Lines.** Split on the seam between the claim and its justification: the claim leads, the reasoning follows.
- **Three Or More Bolded-Lead-In Paragraphs In A Row Are A Table:** claim in one column, how it is enforced in the other.
- **An Enumeration Inside A Sentence Is A List.** A sentence naming three or more vendors, fields, states or controls belongs in bullets or a table. Semicolons separating items are the tell.
- **One Idea Per Block.** A paragraph that states a rule, justifies it and cites a section is three blocks.
- **Reformatting Is Lossless.** Trim what is not load-bearing, but never drop a measured figure, a citation, a section reference or a limitation. Verify by grepping the claims out of the old version and into the new.

## README Navigation

- **A Back-To-Top Link At The Foot Of Each `##` Section,** right-aligned, pointing at the `readme-top` anchor on the first line: `<p align="right"><a href="#readme-top">&uarr;</a></p>`.
- **An Explicit `<a id="..."></a>` Above Any Heading That Is Linked To.** GitHub's generated slugs are unpredictable around emoji and punctuation, and a reader who clicks a broken anchor once does not try again.
