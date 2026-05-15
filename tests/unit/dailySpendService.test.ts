import { DailySpendService } from '../../src/services/dailySpendService';
import { DailyCostFluctuationAnalyzer } from '../../src/analyzers/dailyCostFluctuationAnalyzer';
import { AzureCostManagementService } from '../../src/services/azureCostManagementService';

describe('DailySpendService', () => {
    it('builds a focused daily spend change report from daily service costs', async () => {
        const costService = {
            getDailyServiceCostData: jest.fn().mockResolvedValue({
                startDate: '2026-05-01T00:00:00.000Z',
                endDate: '2026-05-04T00:00:00.000Z',
                totalCost: 450,
                currency: 'USD',
                dailyCosts: [
                    { date: '2026-05-01T00:00:00.000Z', cost: 100, currency: 'USD' },
                    { date: '2026-05-02T00:00:00.000Z', cost: 110, currency: 'USD' },
                    { date: '2026-05-03T00:00:00.000Z', cost: 240, currency: 'USD' }
                ],
                dailyServiceCosts: [
                    { date: '2026-05-01T00:00:00.000Z', serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 60, currency: 'USD' },
                    { date: '2026-05-01T00:00:00.000Z', serviceName: 'Storage', serviceCategory: 'Storage', cost: 40, currency: 'USD' },
                    { date: '2026-05-02T00:00:00.000Z', serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 70, currency: 'USD' },
                    { date: '2026-05-02T00:00:00.000Z', serviceName: 'Storage', serviceCategory: 'Storage', cost: 40, currency: 'USD' },
                    { date: '2026-05-03T00:00:00.000Z', serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 180, currency: 'USD' },
                    { date: '2026-05-03T00:00:00.000Z', serviceName: 'Storage', serviceCategory: 'Storage', cost: 60, currency: 'USD' }
                ],
                costByService: [
                    { serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 310, currency: 'USD', percentageOfTotal: 68.9 },
                    { serviceName: 'Storage', serviceCategory: 'Storage', cost: 140, currency: 'USD', percentageOfTotal: 31.1 }
                ]
            })
        } as unknown as AzureCostManagementService;

        const service = new DailySpendService(costService, new DailyCostFluctuationAnalyzer());
        const report = await service.buildReport(3);

        expect(costService.getDailyServiceCostData).toHaveBeenCalledWith(3);
        expect(report.summary.totalCost).toBe(450);
        expect(report.summary.averageDailyCost).toBe(150);
        expect(report.summary.peakDailyCost?.cost).toBe(240);
        expect(report.serviceTotals[0].serviceName).toBe('Virtual Machines');
        expect(report.dataProvenance).toEqual(expect.objectContaining({
            mode: 'live',
            generatedFromFallback: false
        }));
        expect(report.fluctuations.length).toBeGreaterThan(0);
        expect(report.fluctuations[0].topServiceDrivers[0].serviceName).toBe('Virtual Machines');
    });

    it('excludes the current partial day from fluctuation detection', async () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const toIsoStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
        const yesterdayIso = toIsoStart(yesterday);
        const todayIso = toIsoStart(today);

        const costService = {
            getDailyServiceCostData: jest.fn().mockResolvedValue({
                startDate: yesterdayIso,
                endDate: todayIso,
                totalCost: 500,
                currency: 'USD',
                dailyCosts: [
                    { date: yesterdayIso, cost: 100, currency: 'USD' },
                    { date: todayIso, cost: 400, currency: 'USD' }
                ],
                dailyServiceCosts: [
                    { date: yesterdayIso, serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 100, currency: 'USD' },
                    { date: todayIso, serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 400, currency: 'USD' }
                ],
                costByService: [
                    { serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 500, currency: 'USD', percentageOfTotal: 100 }
                ]
            })
        } as unknown as AzureCostManagementService;

        const service = new DailySpendService(costService, new DailyCostFluctuationAnalyzer());
        const report = await service.buildReport(2);

        expect(report.dailyCosts).toHaveLength(2);
        expect(report.fluctuations).toHaveLength(0);
    });
});
