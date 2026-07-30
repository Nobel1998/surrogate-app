export type MedicalReviewNarrative = {
  introduction: string;
  overallConclusion: string;
};

export function parseMedicalReviewNarrative(
  rawAiResponse?: string | null
): MedicalReviewNarrative | null {
  if (!rawAiResponse) return null;

  try {
    const parsed = JSON.parse(rawAiResponse);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return null;

    const introduction = String(parsed.introduction || '').trim();
    const overallConclusion = String(
      parsed.overallConclusion || parsed.overall_conclusion || ''
    ).trim();

    if (!introduction && !overallConclusion) return null;
    return { introduction, overallConclusion };
  } catch {
    return null;
  }
}
