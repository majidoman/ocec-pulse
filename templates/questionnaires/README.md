# Questionnaire library

Ready-made bilingual questionnaires that ship with every installation. In the app:
**Settings → Survey builder → Import questions from Excel → Ready-made questionnaires**.

| File | Questionnaire | Source |
|---|---|---|
| 00-current-employee-survey | Employee Survey (default, 12 topics) | `current-survey.json` (exported from `src/lib/questionnaire.ts`) |
| 01–05 | Engagement pulse, New joiner, Exit, Wellbeing & safety, Manager effectiveness | `templates.py` |
| 06–10 | Overall satisfaction, Leadership & trust, Career growth, Wellbeing & environment, Recognition & inclusion | `satisfaction-surveys.json` (from Bawsala's "employee-satisfaction-surveys" HTML, converted by `convert-satisfaction-html.py`: OCEC → `{org}`, "(0-10)" removed) |

Rebuild after editing any source (writes `public/templates/library/*.xlsx`, `index.json` and the blank template):

```sh
python3 templates/questionnaires/build.py
```

`{org}` / `{orgName}` in any text are replaced by the organisation's short / full name from Settings → General.
