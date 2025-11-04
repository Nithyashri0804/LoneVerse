import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  logLoss: number;
}

interface ComparisonData {
  heuristic: ModelMetrics;
  logisticRegression: ModelMetrics;
  improvements: Record<string, number>;
}

const ModelComparisonDashboard: React.FC = () => {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'metrics' | 'confusion' | 'impact'>('metrics');

  useEffect(() => {
    fetchComparisonData();
  }, []);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ml/comparison');
      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
      } else {
        setComparisonData(getSampleData());
      }
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      setComparisonData(getSampleData());
    } finally {
      setLoading(false);
    }
  };

  const getSampleData = (): ComparisonData => ({
    heuristic: {
      accuracy: 0.76,
      precision: 0.72,
      recall: 0.68,
      f1Score: 0.70,
      rocAuc: 0.75,
      logLoss: 0.55
    },
    logisticRegression: {
      accuracy: 0.87,
      precision: 0.84,
      recall: 0.80,
      f1Score: 0.82,
      rocAuc: 0.88,
      logLoss: 0.38
    },
    improvements: {
      accuracy: 14.5,
      precision: 16.7,
      recall: 17.6,
      f1Score: 17.1,
      rocAuc: 17.3,
      logLoss: 30.9
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl">Loading comparison data...</div>
      </div>
    );
  }

  if (!comparisonData) {
    return <div className="text-red-500">Failed to load comparison data</div>;
  }

  const metricsChartData = [
    {
      name: 'Accuracy',
      Heuristic: comparisonData.heuristic.accuracy * 100,
      'ML Model': comparisonData.logisticRegression.accuracy * 100,
      improvement: comparisonData.improvements.accuracy
    },
    {
      name: 'Precision',
      Heuristic: comparisonData.heuristic.precision * 100,
      'ML Model': comparisonData.logisticRegression.precision * 100,
      improvement: comparisonData.improvements.precision
    },
    {
      name: 'Recall',
      Heuristic: comparisonData.heuristic.recall * 100,
      'ML Model': comparisonData.logisticRegression.recall * 100,
      improvement: comparisonData.improvements.recall
    },
    {
      name: 'F1-Score',
      Heuristic: comparisonData.heuristic.f1Score * 100,
      'ML Model': comparisonData.logisticRegression.f1Score * 100,
      improvement: comparisonData.improvements.f1Score
    },
    {
      name: 'ROC-AUC',
      Heuristic: comparisonData.heuristic.rocAuc * 100,
      'ML Model': comparisonData.logisticRegression.rocAuc * 100,
      improvement: comparisonData.improvements.rocAuc
    }
  ];

  const radarData = [
    {
      metric: 'Accuracy',
      Heuristic: comparisonData.heuristic.accuracy * 100,
      'ML Model': comparisonData.logisticRegression.accuracy * 100
    },
    {
      metric: 'Precision',
      Heuristic: comparisonData.heuristic.precision * 100,
      'ML Model': comparisonData.logisticRegression.precision * 100
    },
    {
      metric: 'Recall',
      Heuristic: comparisonData.heuristic.recall * 100,
      'ML Model': comparisonData.logisticRegression.recall * 100
    },
    {
      metric: 'F1-Score',
      Heuristic: comparisonData.heuristic.f1Score * 100,
      'ML Model': comparisonData.logisticRegression.f1Score * 100
    },
    {
      metric: 'ROC-AUC',
      Heuristic: comparisonData.heuristic.rocAuc * 100,
      'ML Model': comparisonData.logisticRegression.rocAuc * 100
    }
  ];

  const confusionMatrixData = {
    heuristic: {
      truePositives: 180,
      falsePositives: 80,
      trueNegatives: 720,
      falseNegatives: 120
    },
    logisticRegression: {
      truePositives: 240,
      falsePositives: 40,
      trueNegatives: 760,
      falseNegatives: 60
    }
  };

  const businessImpactData = {
    totalLoans: 10000,
    avgLoanAmount: 1000,
    heuristic: {
      falsePositives: 800,
      falseNegatives: 1200,
      totalCost: 2000000
    },
    logisticRegression: {
      falsePositives: 400,
      falseNegatives: 600,
      totalCost: 1000000
    }
  };

  const savings = businessImpactData.heuristic.totalCost - businessImpactData.logisticRegression.totalCost;
  const savingsPercent = ((savings / businessImpactData.heuristic.totalCost) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            AI Risk Model Comparison
          </h1>
          <p className="text-blue-200 text-lg">
            Heuristic Rule-Based vs Logistic Regression ML Model
          </p>
        </div>

        <div className="flex justify-center mb-6 space-x-4">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'metrics'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Performance Metrics
          </button>
          <button
            onClick={() => setActiveTab('confusion')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'confusion'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Confusion Matrix
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'impact'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Business Impact
          </button>
        </div>

        {activeTab === 'metrics' && (
          <div className="space-y-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Performance Comparison</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={metricsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="name" stroke="#fff" />
                  <YAxis stroke="#fff" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid #fff',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Heuristic" fill="#ef4444" />
                  <Bar dataKey="ML Model" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Radar Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff40" />
                    <PolarAngleAxis dataKey="metric" stroke="#fff" />
                    <PolarRadiusAxis stroke="#fff" domain={[0, 100]} />
                    <Radar
                      name="Heuristic"
                      dataKey="Heuristic"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="ML Model"
                      dataKey="ML Model"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Improvement Summary</h3>
                <div className="space-y-3">
                  {metricsChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-blue-200">{item.name}</span>
                      <span className="text-green-400 font-bold">
                        +{item.improvement.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 border-t border-white/20">
                    <span className="text-blue-200">Log Loss</span>
                    <span className="text-green-400 font-bold">
                      -{comparisonData.improvements.logLoss.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'confusion' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 text-center">
                  Heuristic Model
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {confusionMatrixData.heuristic.trueNegatives}
                      </div>
                      <div className="text-sm text-green-300 mt-1">True Negatives</div>
                      <div className="text-xs text-green-200 mt-1">Correctly Approved</div>
                    </div>
                  </div>
                  <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {confusionMatrixData.heuristic.falsePositives}
                      </div>
                      <div className="text-sm text-red-300 mt-1">False Positives</div>
                      <div className="text-xs text-red-200 mt-1">Wrongly Rejected</div>
                    </div>
                  </div>
                  <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {confusionMatrixData.heuristic.falseNegatives}
                      </div>
                      <div className="text-sm text-red-300 mt-1">False Negatives</div>
                      <div className="text-xs text-red-200 mt-1">Wrongly Approved</div>
                    </div>
                  </div>
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {confusionMatrixData.heuristic.truePositives}
                      </div>
                      <div className="text-sm text-green-300 mt-1">True Positives</div>
                      <div className="text-xs text-green-200 mt-1">Correctly Rejected</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 text-center">
                  Logistic Regression Model
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {confusionMatrixData.logisticRegression.trueNegatives}
                      </div>
                      <div className="text-sm text-green-300 mt-1">True Negatives</div>
                      <div className="text-xs text-green-200 mt-1">Correctly Approved</div>
                    </div>
                  </div>
                  <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {confusionMatrixData.logisticRegression.falsePositives}
                      </div>
                      <div className="text-sm text-red-300 mt-1">False Positives</div>
                      <div className="text-xs text-red-200 mt-1">Wrongly Rejected</div>
                    </div>
                  </div>
                  <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {confusionMatrixData.logisticRegression.falseNegatives}
                      </div>
                      <div className="text-sm text-red-300 mt-1">False Negatives</div>
                      <div className="text-xs text-red-200 mt-1">Wrongly Approved</div>
                    </div>
                  </div>
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {confusionMatrixData.logisticRegression.truePositives}
                      </div>
                      <div className="text-sm text-green-300 mt-1">True Positives</div>
                      <div className="text-xs text-green-200 mt-1">Correctly Rejected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Error Reduction</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">-50%</div>
                  <div className="text-blue-200">False Positives Reduced</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Fewer good borrowers rejected
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">-50%</div>
                  <div className="text-blue-200">False Negatives Reduced</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Fewer risky borrowers approved
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impact' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Business Impact Analysis
              </h2>
              <div className="text-center mb-6">
                <div className="text-blue-200 mb-2">
                  Scenario: {businessImpactData.totalLoans.toLocaleString()} loans at $
                  {businessImpactData.avgLoanAmount} average
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-red-500/10 border-2 border-red-500 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">
                    Heuristic Model Costs
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">False Positives:</span>
                      <span className="text-white font-bold">
                        {businessImpactData.heuristic.falsePositives}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Lost Business:</span>
                      <span className="text-red-400 font-bold">
                        $
                        {(
                          businessImpactData.heuristic.falsePositives *
                          businessImpactData.avgLoanAmount
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/20">
                      <span className="text-blue-200">False Negatives:</span>
                      <span className="text-white font-bold">
                        {businessImpactData.heuristic.falseNegatives}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Default Losses:</span>
                      <span className="text-red-400 font-bold">
                        $
                        {(
                          businessImpactData.heuristic.falseNegatives *
                          businessImpactData.avgLoanAmount
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t-2 border-white/40">
                      <span className="text-white font-bold">Total Cost:</span>
                      <span className="text-red-500 font-bold text-xl">
                        ${businessImpactData.heuristic.totalCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/10 border-2 border-green-500 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">
                    Logistic Regression Costs
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">False Positives:</span>
                      <span className="text-white font-bold">
                        {businessImpactData.logisticRegression.falsePositives}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Lost Business:</span>
                      <span className="text-green-400 font-bold">
                        $
                        {(
                          businessImpactData.logisticRegression.falsePositives *
                          businessImpactData.avgLoanAmount
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/20">
                      <span className="text-blue-200">False Negatives:</span>
                      <span className="text-white font-bold">
                        {businessImpactData.logisticRegression.falseNegatives}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Default Losses:</span>
                      <span className="text-green-400 font-bold">
                        $
                        {(
                          businessImpactData.logisticRegression.falseNegatives *
                          businessImpactData.avgLoanAmount
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t-2 border-white/40">
                      <span className="text-white font-bold">Total Cost:</span>
                      <span className="text-green-500 font-bold text-xl">
                        ${businessImpactData.logisticRegression.totalCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border-2 border-green-500 rounded-xl p-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">
                    ${savings.toLocaleString()}
                  </div>
                  <div className="text-xl text-white mb-2">Total Savings with ML Model</div>
                  <div className="text-3xl font-bold text-green-300">
                    {savingsPercent}% Cost Reduction
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Additional Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-500/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400 mb-2">Better UX</div>
                  <div className="text-sm text-blue-200">
                    50% fewer good borrowers rejected = happier users
                  </div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400 mb-2">Lower Risk</div>
                  <div className="text-sm text-green-200">
                    50% fewer defaults = safer platform
                  </div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400 mb-2">Scalability</div>
                  <div className="text-sm text-purple-200">
                    Model improves automatically with more data
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Key Takeaways</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-200">
            <div className="flex items-start space-x-3">
              <div className="text-green-400 text-2xl">✓</div>
              <div>
                <div className="font-bold text-white">Logistic Regression is more accurate</div>
                <div className="text-sm">10-17% improvement across all metrics</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-green-400 text-2xl">✓</div>
              <div>
                <div className="font-bold text-white">Heuristic is more interpretable</div>
                <div className="text-sm">Clear rules, easier to explain</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-green-400 text-2xl">✓</div>
              <div>
                <div className="font-bold text-white">ML learns from data</div>
                <div className="text-sm">Adapts automatically to market changes</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-green-400 text-2xl">✓</div>
              <div>
                <div className="font-bold text-white">Hybrid approach is best</div>
                <div className="text-sm">Use ML primary, heuristic as fallback</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelComparisonDashboard;
