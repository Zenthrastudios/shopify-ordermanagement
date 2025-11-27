import { useEffect, useState } from 'react';
import { Trophy, AlertTriangle, Star, Clock } from 'lucide-react';
import { analyticsService, RFMScore } from '../../services/analyticsService';

export function RFMAnalysis() {
  const [rfmScores, setRfmScores] = useState<RFMScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string>('all');

  useEffect(() => {
    loadRFMScores();
  }, []);

  const loadRFMScores = async () => {
    setLoading(true);
    try {
      const scores = await analyticsService.getRFMScores();
      setRfmScores(scores);
    } catch (error) {
      console.error('Error loading RFM scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const recalculateRFM = async () => {
    setCalculating(true);
    try {
      const scores = await analyticsService.calculateRFMScores();
      setRfmScores(scores);
    } catch (error) {
      console.error('Error calculating RFM scores:', error);
    } finally {
      setCalculating(false);
    }
  };

  const segmentCounts = rfmScores.reduce((acc, score) => {
    acc[score.rfmSegment] = (acc[score.rfmSegment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredScores = selectedSegment === 'all'
    ? rfmScores
    : rfmScores.filter(s => s.rfmSegment === selectedSegment);

  const getSegmentIcon = (segment: string) => {
    if (segment.includes('Champion')) return <Trophy className="w-5 h-5 text-yellow-600" />;
    if (segment.includes('Risk')) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (segment.includes('Loyal')) return <Star className="w-5 h-5 text-blue-600" />;
    return <Clock className="w-5 h-5 text-gray-600" />;
  };

  const getSegmentColor = (segment: string) => {
    if (segment.includes('Champion')) return 'bg-yellow-100 text-yellow-800';
    if (segment.includes('Risk')) return 'bg-red-100 text-red-800';
    if (segment.includes('Loyal')) return 'bg-blue-100 text-blue-800';
    if (segment.includes('Hibernating')) return 'bg-gray-100 text-gray-800';
    if (segment.includes('Promising')) return 'bg-green-100 text-green-800';
    return 'bg-purple-100 text-purple-800';
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6"><div className="animate-pulse h-64 bg-gray-100 rounded" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">RFM Analysis</h2>
        <button
          onClick={recalculateRFM}
          disabled={calculating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {calculating ? 'Calculating...' : 'Recalculate RFM'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Object.entries(segmentCounts).map(([segment, count]) => (
          <button
            key={segment}
            onClick={() => setSelectedSegment(segment)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedSegment === segment
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              {getSegmentIcon(segment)}
            </div>
            <div className="text-xs font-medium text-gray-500 mb-1">{segment}</div>
            <div className="text-2xl font-bold text-gray-900">{count}</div>
          </button>
        ))}
      </div>

      {selectedSegment !== 'all' && (
        <button
          onClick={() => setSelectedSegment('all')}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Clear filter
        </button>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedSegment === 'all' ? 'All Customers' : `${selectedSegment} Customers`}
            <span className="ml-2 text-sm font-normal text-gray-500">({filteredScores.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFM Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monetary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredScores.slice(0, 50).map((score) => (
                <tr key={score.customerEmail} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{score.customerName}</div>
                    <div className="text-sm text-gray-500">{score.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSegmentColor(score.rfmSegment)}`}>
                      {score.rfmSegment}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{score.rfmScore}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {score.recencyDays}d (Score: {score.recencyScore})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {score.frequencyCount} orders (Score: {score.frequencyScore})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    ${score.monetaryValue.toFixed(2)} (Score: {score.monetaryScore})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{score.lastPurchaseDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">RFM Segment Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold text-blue-900 mb-2">Champions ({segmentCounts['Champions'] || 0})</div>
            <p className="text-blue-700">Reward them. Can be early adopters for new products. Most likely to promote your brand.</p>
          </div>
          <div>
            <div className="font-semibold text-blue-900 mb-2">Loyal Customers ({segmentCounts['Loyal Customers'] || 0})</div>
            <p className="text-blue-700">Upsell higher value products. Ask for reviews. Engage them.</p>
          </div>
          <div>
            <div className="font-semibold text-red-900 mb-2">At Risk ({segmentCounts['At Risk'] || 0})</div>
            <p className="text-red-700">Send personalized emails. Provide limited time offers. Recommend products based on purchase history.</p>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-2">Hibernating ({segmentCounts['Hibernating'] || 0})</div>
            <p className="text-gray-700">Recreate brand value. Offer discounts or win-back campaigns.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
