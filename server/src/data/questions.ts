export interface QuestionDefinition {
  index: number;
  text: string;
  keywordHints: string[];
}

export const questions: QuestionDefinition[] = [
  { index: 0, text: "Tell me about yourself.", keywordHints: [] },
  { index: 1, text: "Describe a difficult team situation.", keywordHints: [] },
  { index: 2, text: "Tell me about a failure or mistake.", keywordHints: [] },
  { index: 3, text: "Describe a project you are proud of.", keywordHints: [] },
  { index: 4, text: "Why are you interested in this role?", keywordHints: [] }
];
