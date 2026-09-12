export interface ManualFieldGuide {
  fieldName: string;
  fieldType: string;
  isRequired?: boolean;
  defaultValue?: string;
  purpose: string;
  hindiExplanation: string;
  formulaOrLogic?: string;
}

export interface ManualStepWorkflow {
  stepNumber: number;
  stepTitle: string;
  actionInstruction: string;
  hindiInstruction: string;
  importantNote?: string;
}

export interface ManualFaqTroubleshoot {
  question: string;
  questionHindi: string;
  answer: string;
  solutionHindi: string;
}

export interface ManualTopic {
  id: string;
  title: string;
  titleHindi: string;
  volumeId: string;
  navigationPath: string;
  keyboardShortcuts?: { key: string; action: string }[];
  overview: string;
  overviewHindi: string;
  uiMockType?: string;
  fieldsBreakdown: ManualFieldGuide[];
  stepByStepGuide: ManualStepWorkflow[];
  proTips: string[];
  proTipsHindi: string[];
  faqs: ManualFaqTroubleshoot[];
}

export interface ManualVolume {
  id: string;
  volumeNumber: number;
  title: string;
  titleHindi: string;
  iconName: string;
  description: string;
  topics: ManualTopic[];
}