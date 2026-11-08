# D-011: A Name In Chinese Or Tamil Script Is Found By Its Cue

|                |                                                                                        |
| -------------- | -------------------------------------------------------------------------------------- |
| **Date**       | 2026-10-08                                                                             |
| **Status**     | Adopted                                                                                |
| **Issues**     | #418                                                                                   |
| **Supersedes** | D-009's "No claim that Mandarin or Tamil is de-identified" bullet, for cued names only |

## Decision

`detectNativeScriptNames` tokenises a name in Chinese or Tamil script where a cue says a name is there, and nothing else. The note keeps reading Mandarin and Tamil speech, which is why `SCRIPT` still leaves both scripts alone.

| Cue                                 | Example                                                           | Tokenised                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Self-introduction, Chinese          | 我叫陈美玲, 我姓陈，叫美玲, 他叫陈伟, 我的名字是美玲              | A name opening on a listed surname; a given name alone only after an unambiguous "my name is" |
| A relative introduced               | 我女儿叫陈小美, 我先生叫林志明, 我老公姓林, என் மனைவி பெயர் கவிதா | The name or surname that follows                                                              |
| Self-introduction, Tamil            | என் பெயர் ஆர். லட்சுமி, என் பேர் முருகன்                          | Up to two words, with an initial                                                              |
| Latin introducer or title before it | Nama saya 陈美玲, Mr 陈, Encik ராமசாமி                            | The script name after an introducer; a surname standing alone after a title                   |
| Title after a surname               | 陈先生, 给林医生, 你好陈小姐, 司徒先生                            | The surname alone, where it starts a word or follows a greeting                               |
| Title before a Tamil name           | திரு ராமசாமி, திருமதி லட்சுமி                                     | One word, with an initial                                                                     |

A name found by its cue is found again wherever it is repeated in the same text, unless it is one character (陈 also opens 陈皮) or the capture did not end a clause, so a wrong guess cut from a phrase is never spread. A Tamil name is carried only as a whole word.

## Why Cues, And Why So Narrow

Measured against a precision corpus of 134 clinical Mandarin, Cantonese, Tamil and code-switched lines, pinned in `../../backend/src/deid/deid.test.ts`, every one of which must pass unchanged. Four rounds of `phi-boundary-auditor` built it.

- **A Chinese name must open on a listed surname.** "我叫" is as often "I called" (我叫救护车, an ambulance) as "my name is", and the surname is what tells them apart.
- **The title rule reads the surname alone, and only where it starts a word.** That is after punctuation, a space, or a verb that takes a person (给, 找, 是, 谢). Reading back from the title turned 白天医生 ("daytime, the doctor") into a name, and any other character before the surname usually makes it the end of a word: 体温医生 ("temperature, the doctor"), 主任医生 ("the consultant").
- **A Latin cue is a whole word and must be followed by a whole name.** "symptoms" contains "Ms", and "Dr 高烧三天" is "doctor, high fever for three days".
- **Bare 名字是 and 病人叫 are not cues.** They are as often a drug's name or a patient crying out.
- **One Tamil word after a title.** A second one was as often the symptom that followed (செல்வி கவிதா இருமல், "cough").

## What Still Passes

- **A name said with no cue.** "陈美玲今天咳嗽" reaches the model on the Auto-Detect path. Translated sessions are unaffected: the script never reaches `turn.text` there.
- **A full name before a title,** as in 陈美玲小姐, and **a given name alone after a bare 我叫**, as in 我叫美玲, both pinned as known gaps. Bare 我叫 is as often "I called" (我叫救护车, an ambulance; 我叫老公, my husband).
- **A surname outside the list,** a Tamil father's name after a title, and a native-script address.

- **Minor misreads still accepted:** a surname-led food or object after 我叫 (我叫陈皮水), a verb after a Tamil cue with no name (திருமதி வந்தாங்க), and a given name after a relative (我儿子叫小明), which the audit rated minor against the cost of reading further.

## What This Decision Does Not License

- **No claim that Mandarin or Tamil is de-identified.** Cued names are; the rest is the residual risk recorded in `../DPIA.md`.
- **No bare surname or given-name list for either script,** and no widening of the cues, without the precision corpus still passing unchanged.
