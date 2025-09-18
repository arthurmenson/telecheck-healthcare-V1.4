import { Logger } from '@utils/logger';
import { MetricsService } from '@utils/metrics-service';
import { ErrorHandler } from '@utils/error-handler';
import * as stats from 'simple-statistics';

export interface RevenueStream {
  id: string;
  name: string;
  category: 'clinical_services' | 'pharmacy' | 'ancillary' | 'capitation' | 'grants' | 'other';
  department: string;
  serviceLines: string[];
  payerTypes: ('medicare' | 'medicaid' | 'commercial' | 'self_pay' | 'other')[];
  isRecurring: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FinancialMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  benchmark: number;
  variance: number;
  variancePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  period: string;
  department: string;
  timestamp: Date;
}

export interface ProfitabilityAnalysis {
  revenueStreamId: string;
  department: string;
  revenue: {
    gross: number;
    net: number;
    adjustments: number;
    writeOffs: number;
  };
  costs: {
    direct: number;
    indirect: number;
    variable: number;
    fixed: number;
  };
  profitability: {
    grossMargin: number;
    netMargin: number;
    contribution: number;
    roi: number;
    ebitda: number;
  };
  volume: {
    encounters: number;
    procedures: number;
    admissions: number;
    averageRevenuePerUnit: number;
  };
  kpis: {
    costPerEncounter: number;
    revenuePerFte: number;
    badDebtRate: number;
    collectionRate: number;
    daysInAr: number;
  };
  period: string;
  timestamp: Date;
}

export interface FinancialForecast {
  department: string;
  forecastPeriod: string;
  predictions: {
    revenue: {
      projected: number;
      confidence: number;
      scenario: 'conservative' | 'realistic' | 'optimistic';
      assumptions: string[];
    };
    expenses: {
      projected: number;
      confidence: number;
      breakdown: Record<string, number>;
    };
    netIncome: {
      projected: number;
      confidence: number;
    };
    cashFlow: {
      projected: number;
      confidence: number;
    };
  }[];
  riskFactors: {
    factor: string;
    impact: 'low' | 'medium' | 'high';
    probability: number;
    mitigation: string;
  }[];
  recommendedActions: {
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;
    timeline: string;
  }[];
  timestamp: Date;
}

export interface FinancialReport {
  period: string;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    operatingMargin: number;
    ebitda: number;
    cashFlow: number;
    revenueGrowth: number;
    expenseGrowth: number;
  };
  departmentAnalysis: ProfitabilityAnalysis[];
  revenueStreams: {
    streamId: string;
    name: string;
    revenue: number;
    growth: number;
    contribution: number;
    risk: string;
  }[];
  keyMetrics: FinancialMetric[];
  alerts: {
    type: 'revenue_decline' | 'cost_overrun' | 'margin_compression' | 'cash_flow' | 'compliance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    affectedDepartments: string[];
    impact: number;
    recommendations: string[];
  }[];
  forecast: FinancialForecast[];
  timestamp: Date;
}

export class RevenueTracker {
  private logger: Logger;
  private metricsService: MetricsService;
  private revenueStreams: Map<string, RevenueStream>;
  private financialMetrics: Map<string, FinancialMetric[]>;
  private profitabilityData: Map<string, ProfitabilityAnalysis[]>;

  constructor() {
    this.logger = new Logger('RevenueTracker');
    this.metricsService = new MetricsService();
    this.revenueStreams = new Map();
    this.financialMetrics = new Map();
    this.profitabilityData = new Map();

    this.setupDefaultRevenueStreams();
  }

  async generateFinancialReport(period: string = 'monthly'): Promise<FinancialReport> {
    const startTime = Date.now();
    this.logger.info(`Generating financial report for period: ${period}`);

    try {
      // Calculate summary metrics
      const summary = await this.calculateFinancialSummary(period);

      // Analyze department profitability
      const departmentAnalysis = await this.analyzeDepartmentProfitability(period);

      // Analyze revenue streams
      const revenueStreams = await this.analyzeRevenueStreams(period);

      // Get key financial metrics
      const keyMetrics = await this.getKeyFinancialMetrics(period);

      // Generate financial alerts
      const alerts = await this.generateFinancialAlerts(summary, departmentAnalysis);

      // Generate forecasts
      const forecast = await this.generateFinancialForecasts(period);

      const report: FinancialReport = {
        period,
        summary,
        departmentAnalysis,
        revenueStreams,
        keyMetrics,
        alerts,
        forecast,
        timestamp: new Date()
      };

      // Record metrics
      this.metricsService.recordFinancialMetric('total_revenue', summary.totalRevenue, 'organization');
      this.metricsService.recordFinancialMetric('net_income', summary.netIncome, 'organization');
      this.metricsService.recordFinancialMetric('operating_margin', summary.operatingMargin, 'organization');
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'financial_report', true);

      this.logger.info('Financial report generated successfully', {
        period,
        totalRevenue: summary.totalRevenue,
        netIncome: summary.netIncome,
        operatingMargin: summary.operatingMargin,
        generationTime: Date.now() - startTime
      });

      return report;

    } catch (error) {
      this.logger.error('Failed to generate financial report', { error });
      this.metricsService.recordAnalyticsQuery(Date.now() - startTime, 'financial_report', false);
      throw ErrorHandler.analyticsError(`Financial report generation failed: ${error}`);
    }
  }

  async trackRevenueStream(streamId: string, period: string): Promise<ProfitabilityAnalysis> {
    this.logger.info(`Tracking revenue stream: ${streamId} for period: ${period}`);

    try {
      const stream = this.revenueStreams.get(streamId);
      if (!stream) {
        throw ErrorHandler.validationError(`Revenue stream not found: ${streamId}`);
      }

      // Calculate revenue metrics
      const revenue = await this.calculateRevenueMetrics(streamId, period);

      // Calculate cost metrics
      const costs = await this.calculateCostMetrics(streamId, period);

      // Calculate profitability metrics
      const profitability = this.calculateProfitabilityMetrics(revenue, costs);

      // Calculate volume metrics
      const volume = await this.calculateVolumeMetrics(streamId, period);

      // Calculate KPIs
      const kpis = this.calculateFinancialKPIs(revenue, costs, volume);

      const analysis: ProfitabilityAnalysis = {
        revenueStreamId: streamId,
        department: stream.department,
        revenue,
        costs,
        profitability,
        volume,
        kpis,
        period,
        timestamp: new Date()
      };

      // Store analysis
      const existing = this.profitabilityData.get(streamId) || [];
      existing.push(analysis);
      this.profitabilityData.set(streamId, existing);

      // Record metrics
      this.metricsService.recordFinancialMetric('gross_margin', profitability.grossMargin, stream.department);
      this.metricsService.recordFinancialMetric('net_margin', profitability.netMargin, stream.department);

      this.logger.info(`Revenue stream tracking completed: ${streamId}`, {
        grossRevenue: revenue.gross,
        netRevenue: revenue.net,
        grossMargin: profitability.grossMargin,
        netMargin: profitability.netMargin
      });

      return analysis;

    } catch (error) {
      this.logger.error(`Revenue stream tracking failed: ${streamId}`, { error });
      throw ErrorHandler.analyticsError(`Revenue stream tracking failed: ${error}`);
    }
  }

  async calculateROI(investmentAmount: number, departmentId: string, timeframe: string): Promise<{
    roi: number;
    paybackPeriod: number;
    npv: number;
    irr: number;
    breakEvenPoint: number;
    riskAdjustedReturn: number;
  }> {
    this.logger.info(`Calculating ROI for department: ${departmentId}`, { investmentAmount, timeframe });

    try {
      // Get historical financial data
      const historicalData = await this.getHistoricalFinancialData(departmentId, timeframe);

      // Calculate projected cash flows
      const projectedCashFlows = this.projectCashFlows(historicalData, investmentAmount, timeframe);

      // Calculate ROI metrics
      const totalReturn = projectedCashFlows.reduce((sum, cf) => sum + cf, 0);
      const roi = ((totalReturn - investmentAmount) / investmentAmount) * 100;

      // Calculate payback period
      const paybackPeriod = this.calculatePaybackPeriod(projectedCashFlows, investmentAmount);

      // Calculate NPV (simplified)
      const discountRate = 0.1; // 10% discount rate
      const npv = this.calculateNPV(projectedCashFlows, discountRate, investmentAmount);

      // Calculate IRR (simplified)
      const irr = this.calculateIRR(projectedCashFlows, investmentAmount);

      // Calculate break-even point
      const breakEvenPoint = this.calculateBreakEvenPoint(historicalData, investmentAmount);

      // Risk-adjusted return
      const riskAdjustedReturn = roi * 0.8; // Apply 20% risk adjustment

      const result = {
        roi,
        paybackPeriod,
        npv,
        irr,
        breakEvenPoint,
        riskAdjustedReturn
      };

      this.logger.info(`ROI calculation completed for department: ${departmentId}`, result);

      return result;

    } catch (error) {
      this.logger.error(`ROI calculation failed for department: ${departmentId}`, { error });
      throw ErrorHandler.analyticsError(`ROI calculation failed: ${error}`);
    }
  }

  private async calculateFinancialSummary(period: string): Promise<FinancialReport['summary']> {
    // Simulate financial summary calculation
    const baseRevenue = 10000000; // $10M base
    const totalRevenue = baseRevenue * (1 + (Math.random() - 0.5) * 0.2);
    const totalExpenses = totalRevenue * (0.85 + Math.random() * 0.1);
    const netIncome = totalRevenue - totalExpenses;
    const operatingMargin = (netIncome / totalRevenue) * 100;
    const ebitda = netIncome * 1.2; // Simplified EBITDA
    const cashFlow = netIncome * 1.1; // Simplified cash flow

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      operatingMargin,
      ebitda,
      cashFlow,
      revenueGrowth: (Math.random() - 0.5) * 20,
      expenseGrowth: (Math.random() - 0.5) * 15
    };
  }

  private async analyzeDepartmentProfitability(period: string): Promise<ProfitabilityAnalysis[]> {
    const departments = ['Emergency', 'Surgery', 'Cardiology', 'Oncology', 'Orthopedics'];
    const analyses: ProfitabilityAnalysis[] = [];

    for (const department of departments) {
      const revenue = {
        gross: Math.random() * 2000000 + 1000000,
        net: 0,
        adjustments: 0,
        writeOffs: 0
      };
      revenue.adjustments = revenue.gross * 0.1;
      revenue.writeOffs = revenue.gross * 0.05;
      revenue.net = revenue.gross - revenue.adjustments - revenue.writeOffs;

      const costs = {
        direct: revenue.net * 0.6,
        indirect: revenue.net * 0.2,
        variable: revenue.net * 0.5,
        fixed: revenue.net * 0.3
      };

      const profitability = this.calculateProfitabilityMetrics(revenue, costs);

      const volume = {
        encounters: Math.floor(Math.random() * 10000) + 5000,
        procedures: Math.floor(Math.random() * 5000) + 2000,
        admissions: Math.floor(Math.random() * 2000) + 1000,
        averageRevenuePerUnit: 0
      };
      volume.averageRevenuePerUnit = revenue.net / volume.encounters;

      const kpis = this.calculateFinancialKPIs(revenue, costs, volume);

      analyses.push({
        revenueStreamId: department.toLowerCase(),
        department,
        revenue,
        costs,
        profitability,
        volume,
        kpis,
        period,
        timestamp: new Date()
      });
    }

    return analyses;
  }

  private async analyzeRevenueStreams(period: string): Promise<FinancialReport['revenueStreams']> {
    const streams: FinancialReport['revenueStreams'] = [];

    for (const stream of this.revenueStreams.values()) {
      const revenue = Math.random() * 1000000 + 500000;
      const growth = (Math.random() - 0.5) * 30;
      const contribution = revenue / 10000000 * 100; // Percentage of total revenue

      streams.push({
        streamId: stream.id,
        name: stream.name,
        revenue,
        growth,
        contribution,
        risk: stream.riskLevel
      });
    }

    return streams;
  }

  private async getKeyFinancialMetrics(period: string): Promise<FinancialMetric[]> {
    const metrics: FinancialMetric[] = [
      {
        id: 'operating-margin',
        name: 'Operating Margin',
        value: Math.random() * 20 + 10,
        target: 15,
        benchmark: 18,
        variance: 0,
        variancePercent: 0,
        trend: 'increasing',
        period,
        department: 'Organization',
        timestamp: new Date()
      },
      {
        id: 'revenue-per-bed',
        name: 'Revenue per Bed',
        value: Math.random() * 500000 + 400000,
        target: 450000,
        benchmark: 500000,
        variance: 0,
        variancePercent: 0,
        trend: 'stable',
        period,
        department: 'Organization',
        timestamp: new Date()
      },
      {
        id: 'cost-per-discharge',
        name: 'Cost per Discharge',
        value: Math.random() * 5000 + 8000,
        target: 10000,
        benchmark: 9000,
        variance: 0,
        variancePercent: 0,
        trend: 'decreasing',
        period,
        department: 'Organization',
        timestamp: new Date()
      }
    ];

    // Calculate variance for each metric
    metrics.forEach(metric => {
      metric.variance = metric.value - metric.target;
      metric.variancePercent = (metric.variance / metric.target) * 100;
    });

    return metrics;
  }

  private async generateFinancialAlerts(summary: any, departmentAnalysis: ProfitabilityAnalysis[]): Promise<FinancialReport['alerts']> {
    const alerts: FinancialReport['alerts'] = [];

    // Check operating margin
    if (summary.operatingMargin < 10) {
      alerts.push({
        type: 'margin_compression',
        severity: summary.operatingMargin < 5 ? 'critical' : 'high',
        message: `Operating margin is below acceptable threshold (${summary.operatingMargin.toFixed(2)}%)`,
        affectedDepartments: ['Organization'],
        impact: summary.totalRevenue * (10 - summary.operatingMargin) / 100,
        recommendations: [
          'Review expense management strategies',
          'Optimize revenue cycle processes',
          'Implement cost reduction initiatives'
        ]
      });
    }

    // Check department profitability
    departmentAnalysis.forEach(dept => {
      if (dept.profitability.netMargin < 5) {
        alerts.push({
          type: 'revenue_decline',
          severity: 'medium',
          message: `${dept.department} showing low profitability (${dept.profitability.netMargin.toFixed(2)}% net margin)`,
          affectedDepartments: [dept.department],
          impact: dept.revenue.net * 0.1,
          recommendations: [
            'Review department operational efficiency',
            'Analyze service line profitability',
            'Consider strategic repositioning'
          ]
        });
      }
    });

    return alerts;
  }

  private async generateFinancialForecasts(period: string): Promise<FinancialForecast[]> {
    const departments = ['Emergency', 'Surgery', 'Cardiology'];
    const forecasts: FinancialForecast[] = [];

    for (const department of departments) {
      const baseRevenue = Math.random() * 2000000 + 1000000;

      forecasts.push({
        department,
        forecastPeriod: '12 months',
        predictions: [
          {
            revenue: {
              projected: baseRevenue * 1.05,
              confidence: 0.85,
              scenario: 'conservative',
              assumptions: ['5% growth rate', 'stable market conditions']
            },
            expenses: {
              projected: baseRevenue * 0.8,
              confidence: 0.90,
              breakdown: {
                'Personnel': baseRevenue * 0.5,
                'Supplies': baseRevenue * 0.2,
                'Overhead': baseRevenue * 0.1
              }
            },
            netIncome: {
              projected: baseRevenue * 0.25,
              confidence: 0.75
            },
            cashFlow: {
              projected: baseRevenue * 0.3,
              confidence: 0.80
            }
          }
        ],
        riskFactors: [
          {
            factor: 'Regulatory changes',
            impact: 'medium',
            probability: 0.3,
            mitigation: 'Monitor regulatory environment'
          },
          {
            factor: 'Market competition',
            impact: 'high',
            probability: 0.6,
            mitigation: 'Strengthen service differentiation'
          }
        ],
        recommendedActions: [
          {
            action: 'Optimize staffing levels',
            priority: 'high',
            expectedImpact: 0.05,
            timeline: '3 months'
          },
          {
            action: 'Implement revenue cycle improvements',
            priority: 'medium',
            expectedImpact: 0.03,
            timeline: '6 months'
          }
        ],
        timestamp: new Date()
      });
    }

    return forecasts;
  }

  private calculateRevenueMetrics(streamId: string, period: string): Promise<ProfitabilityAnalysis['revenue']> {
    // Simulate revenue calculation
    const gross = Math.random() * 1000000 + 500000;
    const adjustments = gross * 0.1;
    const writeOffs = gross * 0.05;
    const net = gross - adjustments - writeOffs;

    return Promise.resolve({
      gross,
      net,
      adjustments,
      writeOffs
    });
  }

  private calculateCostMetrics(streamId: string, period: string): Promise<ProfitabilityAnalysis['costs']> {
    const revenue = Math.random() * 850000 + 425000; // Net revenue estimate

    return Promise.resolve({
      direct: revenue * 0.6,
      indirect: revenue * 0.2,
      variable: revenue * 0.5,
      fixed: revenue * 0.3
    });
  }

  private calculateProfitabilityMetrics(revenue: ProfitabilityAnalysis['revenue'], costs: ProfitabilityAnalysis['costs']): ProfitabilityAnalysis['profitability'] {
    const grossMargin = ((revenue.gross - costs.direct) / revenue.gross) * 100;
    const netMargin = ((revenue.net - costs.direct - costs.indirect) / revenue.net) * 100;
    const contribution = revenue.net - costs.variable;
    const totalCosts = costs.direct + costs.indirect;
    const ebitda = revenue.net - totalCosts;
    const roi = totalCosts > 0 ? (ebitda / totalCosts) * 100 : 0;

    return {
      grossMargin,
      netMargin,
      contribution,
      roi,
      ebitda
    };
  }

  private calculateVolumeMetrics(streamId: string, period: string): Promise<ProfitabilityAnalysis['volume']> {
    const encounters = Math.floor(Math.random() * 5000) + 2000;
    const procedures = Math.floor(Math.random() * 2000) + 1000;
    const admissions = Math.floor(Math.random() * 1000) + 500;

    return Promise.resolve({
      encounters,
      procedures,
      admissions,
      averageRevenuePerUnit: 850000 / encounters // Using estimated net revenue
    });
  }

  private calculateFinancialKPIs(revenue: ProfitabilityAnalysis['revenue'], costs: ProfitabilityAnalysis['costs'], volume: ProfitabilityAnalysis['volume']): ProfitabilityAnalysis['kpis'] {
    const totalCosts = costs.direct + costs.indirect;
    const costPerEncounter = totalCosts / volume.encounters;
    const revenuePerFte = revenue.net / 50; // Assuming 50 FTEs
    const badDebtRate = (revenue.writeOffs / revenue.gross) * 100;
    const collectionRate = (revenue.net / revenue.gross) * 100;
    const daysInAr = Math.random() * 30 + 30; // 30-60 days

    return {
      costPerEncounter,
      revenuePerFte,
      badDebtRate,
      collectionRate,
      daysInAr
    };
  }

  private async getHistoricalFinancialData(departmentId: string, timeframe: string): Promise<number[]> {
    // Simulate historical data - monthly net income for the department
    const months = timeframe === 'annual' ? 12 : 6;
    return Array.from({ length: months }, () => Math.random() * 100000 + 50000);
  }

  private projectCashFlows(historicalData: number[], investmentAmount: number, timeframe: string): number[] {
    const months = timeframe === 'annual' ? 12 : 6;
    const averageIncome = stats.mean(historicalData);
    const growthRate = 0.05; // 5% growth from investment

    return Array.from({ length: months }, (_, i) => {
      const baseFlow = averageIncome * (1 + growthRate);
      const seasonality = 1 + Math.sin(i * Math.PI / 6) * 0.1; // 10% seasonal variation
      return baseFlow * seasonality;
    });
  }

  private calculatePaybackPeriod(cashFlows: number[], investment: number): number {
    let cumulativeCashFlow = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      cumulativeCashFlow += cashFlows[i];
      if (cumulativeCashFlow >= investment) {
        return i + 1; // Return period in months
      }
    }
    return cashFlows.length; // If not paid back within timeframe
  }

  private calculateNPV(cashFlows: number[], discountRate: number, investment: number): number {
    let npv = -investment;
    for (let i = 0; i < cashFlows.length; i++) {
      npv += cashFlows[i] / Math.pow(1 + discountRate / 12, i + 1);
    }
    return npv;
  }

  private calculateIRR(cashFlows: number[], investment: number): number {
    // Simplified IRR calculation using approximation
    const totalCashFlow = cashFlows.reduce((sum, cf) => sum + cf, 0);
    const averageReturn = totalCashFlow / cashFlows.length;
    return ((averageReturn / investment) * 12) * 100; // Annualized percentage
  }

  private calculateBreakEvenPoint(historicalData: number[], investmentAmount: number): number {
    const averageMonthlyIncome = stats.mean(historicalData);
    const additionalIncomeNeeded = investmentAmount / 12; // Amortize over 12 months
    return Math.ceil(additionalIncomeNeeded / averageMonthlyIncome);
  }

  private setupDefaultRevenueStreams(): void {
    this.revenueStreams.set('emergency-services', {
      id: 'emergency-services',
      name: 'Emergency Department Services',
      category: 'clinical_services',
      department: 'Emergency',
      serviceLines: ['Emergency Care', 'Trauma', 'Urgent Care'],
      payerTypes: ['medicare', 'medicaid', 'commercial', 'self_pay'],
      isRecurring: true,
      riskLevel: 'medium'
    });

    this.revenueStreams.set('surgical-services', {
      id: 'surgical-services',
      name: 'Surgical Services',
      category: 'clinical_services',
      department: 'Surgery',
      serviceLines: ['General Surgery', 'Orthopedic Surgery', 'Cardiac Surgery'],
      payerTypes: ['medicare', 'medicaid', 'commercial'],
      isRecurring: true,
      riskLevel: 'low'
    });

    this.revenueStreams.set('pharmacy-services', {
      id: 'pharmacy-services',
      name: 'Pharmacy Services',
      category: 'pharmacy',
      department: 'Pharmacy',
      serviceLines: ['Inpatient Pharmacy', 'Outpatient Pharmacy', 'Specialty Pharmacy'],
      payerTypes: ['medicare', 'medicaid', 'commercial', 'self_pay'],
      isRecurring: true,
      riskLevel: 'medium'
    });

    this.revenueStreams.set('diagnostic-imaging', {
      id: 'diagnostic-imaging',
      name: 'Diagnostic Imaging',
      category: 'ancillary',
      department: 'Radiology',
      serviceLines: ['CT', 'MRI', 'X-Ray', 'Ultrasound'],
      payerTypes: ['medicare', 'medicaid', 'commercial'],
      isRecurring: true,
      riskLevel: 'low'
    });
  }

  getRevenueStreams(): RevenueStream[] {
    return Array.from(this.revenueStreams.values());
  }

  addRevenueStream(stream: RevenueStream): void {
    this.revenueStreams.set(stream.id, stream);
    this.logger.info(`Added revenue stream: ${stream.name}`);
  }

  getFinancialMetrics(department?: string): FinancialMetric[] {
    const allMetrics: FinancialMetric[] = [];

    for (const metrics of this.financialMetrics.values()) {
      if (!department || metrics.some(m => m.department === department)) {
        allMetrics.push(...metrics.filter(m => !department || m.department === department));
      }
    }

    return allMetrics;
  }
}

// Export for CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new RevenueTracker();

  tracker.generateFinancialReport('monthly')
    .then(report => {
      console.log('Financial Report Generated:');
      console.log(`Total Revenue: $${report.summary.totalRevenue.toLocaleString()}`);
      console.log(`Net Income: $${report.summary.netIncome.toLocaleString()}`);
      console.log(`Operating Margin: ${report.summary.operatingMargin.toFixed(2)}%`);
      console.log(`Revenue Growth: ${report.summary.revenueGrowth.toFixed(2)}%`);
      console.log(`Departments Analyzed: ${report.departmentAnalysis.length}`);
      console.log(`Revenue Streams: ${report.revenueStreams.length}`);
      console.log(`Alerts Generated: ${report.alerts.length}`);
      console.log(`Forecasts: ${report.forecast.length}`);
    })
    .catch(console.error);
}