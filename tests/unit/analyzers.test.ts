import { CostTrendAnalyzer } from '../../src/analyzers/costTrendAnalyzer';
import { ResourceOptimizationAnalyzer } from '../../src/analyzers/resourceOptimizationAnalyzer';
import { AnomalyDetector } from '../../src/analyzers/anomalyDetector';

describe('CostTrendAnalyzer', () => {
    let costTrendAnalyzer: CostTrendAnalyzer;

    beforeEach(() => {
        costTrendAnalyzer = new CostTrendAnalyzer();
    });

    it('should analyze cost trends correctly', () => {
        const mockData = [
            { date: '2023-01-01', cost: 100 },
            { date: '2023-02-01', cost: 150 },
            { date: '2023-03-01', cost: 120 },
        ];
        const result = costTrendAnalyzer.analyze(mockData);
        expect(result).toEqual(expect.objectContaining({
            averageCost: expect.any(Number),
            trend: expect.any(String),
        }));
    });
});

describe('ResourceOptimizationAnalyzer', () => {
    let resourceOptimizationAnalyzer: ResourceOptimizationAnalyzer;

    beforeEach(() => {
        resourceOptimizationAnalyzer = new ResourceOptimizationAnalyzer();
    });

    it('should identify underutilized resources', () => {
        const mockResources = [
            { id: '1', usage: 5, threshold: 10 },
            { id: '2', usage: 0, threshold: 10 },
        ];
        const result = resourceOptimizationAnalyzer.identifyUnderutilized(mockResources);
        expect(result).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: '2' }),
        ]));
    });
});

describe('AnomalyDetector', () => {
    let anomalyDetector: AnomalyDetector;

    beforeEach(() => {
        anomalyDetector = new AnomalyDetector();
    });

    it('should detect anomalies in cost data', () => {
        const mockCostData = [
            { date: '2023-01-01', cost: 100 },
            { date: '2023-01-02', cost: 1000 }, // Anomaly
            { date: '2023-01-03', cost: 150 },
        ];
        const result = anomalyDetector.detect(mockCostData);
        expect(result).toEqual(expect.arrayContaining([
            expect.objectContaining({ date: '2023-01-02', cost: 1000 }),
        ]));
    });
});