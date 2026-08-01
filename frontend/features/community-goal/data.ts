export type CommunityGoalWidgetContent = {
  title: string;
  monthlyGoalLabel: string;
  amountRaisedHkd: number;
  amountGoalHkd: number;
  sessionsSupported: number;
  sessionsGoal: number;
  ctaLabel: string;
  socialProof: string;
};

export const communityGoalWidgetContent: CommunityGoalWidgetContent = {
  title: "Community goal",
  monthlyGoalLabel: "Help fund 20 sports sessions this month",
  amountRaisedHkd: 7500,
  amountGoalHkd: 10000,
  sessionsSupported: 15,
  sessionsGoal: 20,
  ctaLabel: "Help complete the goal",
  socialProof: "Someone donated HK$100",
};
