#!/bin/bash

# Update DynamicComplianceCard
sed -i '' 's/Dynamic Compliance Tracker/Regulatory Compliance Monitor/g' DynamicComplianceCard.tsx
sed -i '' 's/Adaptive rules engine/Automated compliance tracking/g' DynamicComplianceCard.tsx
sed -i '' 's/Compliance trend analysis/Performance metrics/g' DynamicComplianceCard.tsx
sed -i '' 's/Real-time updating/Real-time monitoring/g' DynamicComplianceCard.tsx

# Update PatientEngagementCard  
sed -i '' 's/Patient Engagement AI/Patient Communication Hub/g' PatientEngagementCard.tsx
sed -i '' 's/Conversational assistant/Secure messaging portal/g' PatientEngagementCard.tsx
sed -i '' 's/Patient satisfaction trending/Engagement metrics/g' PatientEngagementCard.tsx
sed -i '' 's/Multiple language support/Multi-channel communication/g' PatientEngagementCard.tsx

# Update PracticeAnalyticsCard
sed -i '' "s/360° Practice Analytics/Practice Performance Dashboard/g" PracticeAnalyticsCard.tsx
sed -i '' 's/Predictive analytics/Key performance indicators/g' PracticeAnalyticsCard.tsx
sed -i '' 's/Declining patient trends/Trend analysis/g' PracticeAnalyticsCard.tsx
sed -i '' 's/Scenario modeling/Financial forecasting/g' PracticeAnalyticsCard.tsx

# Update RevenueGrowthCard
sed -i '' 's/Revenue Growth Automations/Financial Management Suite/g' RevenueGrowthCard.tsx
sed -i '' 's/Native text building programs/Automated billing workflows/g' RevenueGrowthCard.tsx
sed -i '' 's/Patient retention campaigns/Revenue optimization/g' RevenueGrowthCard.tsx
sed -i '' 's/Revenue ROI optimization/Financial analytics/g' RevenueGrowthCard.tsx

# Update AISchedulingCard
sed -i '' 's/AI-First Scheduling/Intelligent Scheduling System/g' AISchedulingCard.tsx
sed -i '' 's/Patient self-booking/Online appointment booking/g' AISchedulingCard.tsx
sed -i '' 's/Inventory management/Resource management/g' AISchedulingCard.tsx
sed -i '' 's/Adaptive scheduling/Smart scheduling optimization/g' AISchedulingCard.tsx

# Update MultiIntegrationCard
sed -i '' 's/Seamless Multi-Integration/Integration Management Center/g' MultiIntegrationCard.tsx
sed -i '' 's/Native labs, pharmacy connections/Healthcare system integrations/g' MultiIntegrationCard.tsx
sed -i '' 's/Clearinghouse connectors/Third-party connectors/g' MultiIntegrationCard.tsx
sed -i '' 's/Modular design architecture/API management platform/g' MultiIntegrationCard.tsx

echo "Card titles updated successfully!"
