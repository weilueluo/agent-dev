---
name: review-task
description: "Final quality review. Evaluates correctness, design, plan adherence, and test adequacy. Outputs one disposition: approve, approve-with-follow-ups, revise, or replan."
version: 3.0.0
---

# review-task

Make the final quality call on the delivered work.

## When to Use

- After testing completes
- As the last gate before delivery

## Inputs

- **test_report**: Test results and confidence
- **implementation_report**: Changes and deviations
- **plan**: Plan and acceptance criteria
- **mode**: Review depth (quick/standard/deep/high-risk)

## Process

1. Review all artifacts — exploration findings, plan, implementation report, test report
2. Review changes for correctness, design, maintainability, convention adherence
3. Walk each acceptance criterion — satisfied, partially met, or not met
4. Evaluate any deviations from the plan
5. Weigh test results and residual risk
6. Score dimensions (roughly 0-10): correctness, design quality, maintainability, plan adherence, test adequacy
7. Choose exactly one disposition: approve, approve-with-follow-ups, revise, or replan
8. Explain reasoning briefly — include primary reason, blocking issues, severity

## Output

Review report: decision, dimension scores, issues found, follow-ups (if applicable), and summary. If replan, include failure analysis.
