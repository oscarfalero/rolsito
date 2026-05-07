export class JoinCampaignDto {
  campaignId: string;
}

export class SubmitActionDto {
  campaignId: string;
  content: string;
  characterId?: string;
}
