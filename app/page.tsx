'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Use dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false }) as any;

// Define types
interface BlockSummary {
  site: string;
  block_type: string;
  count: number;
  percent: number;
  avg_position: number;
}

interface Block {
  type: string;
  text: string;
}

interface QASample {
  site: string;
  question_title: string;
  question_body: string;
  answer_body: string;
  audience_level?: string;
  tone?: string;
  blocks: Block[];
}

// Color palette for all block types :D
const BLOCK_COLORS = {
  'Analogy': 'hsla(325, 100.00%, 42.00%, 0.80)',
  'Application': 'hsla(314, 100.00%, 30.20%, 0.80)',
  'Assumption': 'hsla(358, 89.80%, 38.60%, 0.80)',
  'Cause/Effect': 'hsla(0, 64.50%, 58.00%, 0.80)',
  'Caveat': 'hsla(0, 88.90%, 49.40%, 0.80)',
  'Citation': 'hsla(22, 97.80%, 65.10%, 0.80)',
  'Claim': 'hsla(39, 86.50%, 56.30%, 0.80)',
  'Classification': 'hsla(48, 100.00%, 50.00%, 0.80)',
  'Comparison': 'hsla(70, 82.80%, 47.80%, 0.80)',
  'Context': 'hsla(92, 90.50%, 41.20%, 0.80)',
  'Counterexample': 'hsla(118, 100.00%, 34.90%, 0.80)',
  'Definition': 'hsla(112, 95.60%, 17.60%, 0.80)',
  'Description': 'hsla(189, 100.00%, 30.40%, 0.80)',
  'Elaboration': 'hsla(147, 66.20%, 54.70%, 0.80)',
  'Emphasis': 'hsla(161, 100.00%, 32.40%, 0.80)',
  'Evidence': 'hsla(167, 100.00%, 22.00%, 0.80)',
  'Example': 'hsla(180, 99.20%, 49.00%, 0.80)',
  'Explanation': 'hsla(189, 100.00%, 33.50%, 0.80)',
  'Historical Reference': 'hsla(199, 100.00%, 29.60%, 0.80)',
  'Hypothesis': 'hsla(216, 100.00%, 49.80%, 0.80)',
  'Implication': 'hsla(219, 100.00%, 39.80%, 0.80)',
  'Procedure': 'hsla(230, 98.10%, 20.40%, 0.80)',
  'Qualification': 'hsla(247, 100.00%, 55.50%, 0.80)',
  'Question': 'hsla(253, 98.00%, 61.40%, 0.80)',
  'Quote': 'hsla(258, 100.00%, 70.60%, 0.80)',
  'Source': 'hsla(266, 100.00%, 30.40%, 0.80)',
  'Rule': 'hsla(270, 100.00%, 60.80%, 0.80)',
  'Story': 'hsla(302, 100.00%, 50.00%, 0.80)',
  'Summary': 'hsla(300, 100.00%, 69.80%, 0.80)',
  'Transition': 'hsla(327, 79.40%, 65.70%, 0.80)',
  'Visual Description': 'hsla(350, 100.00%, 75.10%, 0.80)'
};

// Default color for any block type not in the palette
const DEFAULT_COLOR = 'hsla(0, 0%, 50%, 0.8)';

export default function Page() {
  // State for data
  const [blockSummaries, setBlockSummaries] = useState<BlockSummary[]>([]);
  const [qaSamples, setQaSamples] = useState<QASample[]>([]);
  const [randomSample, setRandomSample] = useState<QASample | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [uniqueSites, setUniqueSites] = useState<string[]>([]);
  const [activeBlocks, setActiveBlocks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [chartType, setChartType] = useState<string>('bar');
  const [selectedMetric, setSelectedMetric] = useState<string>('count');
  const [topN, setTopN] = useState<number>(3);
  const [selectedBlockType, setSelectedBlockType] = useState<string | null>(null);
  const [hoveredBlockType, setHoveredBlockType] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch block summaries
        const blockSummaryRes = await fetch('/data/block_summary.json');
        const blockSummaryData = await blockSummaryRes.json();
        setBlockSummaries(blockSummaryData);
        
        // Extract unique sites
        const sites = [...new Set(blockSummaryData.map((item: BlockSummary) => item.site))];
        setUniqueSites(sites);
        
        // Fetch QA samples
        const qaSamplesRes = await fetch('/data/answer_samples.json');
        const qaSamplesData = await qaSamplesRes.json();
        setQaSamples(qaSamplesData);
        
        // Pick random sample
        const randomIndex = Math.floor(Math.random() * qaSamplesData.length);
        const sample = qaSamplesData[randomIndex];
        setRandomSample(sample);
        
        setActiveBlocks(new Set(sample.blocks.map((b: Block) => b.type)));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getRandomSample = () => {
    if (qaSamples.length === 0) return;
    
    const samples = selectedSite === 'all' 
      ? qaSamples
      : qaSamples.filter(sample => sample.site === selectedSite);
    
    if (samples.length === 0) {
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * samples.length);
    const sample = samples[randomIndex];
    setRandomSample(sample);
    
    // Update active blocks for new sample
    setActiveBlocks(new Set(sample.blocks.map(b => b.type)));
  };

  // Toggle a block type's visibility
  const toggleBlock = (type: string) => {
    setActiveBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSite(e.target.value);
  };

  // Function to get a color for block types
  const getBlockColor = (blockType: string) => {
    return BLOCK_COLORS[blockType] || DEFAULT_COLOR;
  };

  // Calculate block type stats
  const calculateBlockTypeStats = (blockType: string) => {
    const typeData = blockSummaries.filter(item => item.block_type === blockType);
    
    const totalCount = typeData.reduce((sum, item) => sum + item.count, 0);
    const avgPercent = typeData.reduce((sum, item) => sum + item.percent, 0) / typeData.length;
    const avgPosition = typeData.reduce((sum, item) => sum + item.avg_position * item.count, 0) / totalCount;
    
    return {
      totalCount,
      avgPercent: avgPercent.toFixed(1),
      avgPosition: avgPosition.toFixed(1),
      sites: typeData.map(item => ({
        site: item.site,
        count: item.count,
        percent: item.percent.toFixed(1)
      }))
    };
  };

  // Create chart data 
  const createEnhancedChart = () => {
    if (blockSummaries.length === 0) return null;
    
    const filteredData = selectedSite === 'all'
      ? blockSummaries
      : blockSummaries.filter(item => item.site === selectedSite);
      
    const blockTypeMap = new Map();
    
    filteredData.forEach(item => {
      if (!blockTypeMap.has(item.block_type)) {
        blockTypeMap.set(item.block_type, {
          count: 0,
          percent: 0,
          avg_position: 0,
          instances: 0
        });
      }
      
      const currentData = blockTypeMap.get(item.block_type);
      currentData.count += item.count;
      currentData.percent += item.percent;
      currentData.avg_position += item.avg_position * item.count; // Weighted average
      currentData.instances += 1;
    });
    
    // Calculate final values and convert to array
    const aggregatedData = Array.from(blockTypeMap.entries()).map(([blockType, data]) => {
      return {
        block_type: blockType,
        count: data.count,
        percent: data.percent / data.instances, // Average percentage
        avg_position: data.avg_position / data.count // Weighted average position
      };
    });

    // For "All Sites", normalize percentages to sum to 100%
    if (selectedSite === 'all' && selectedMetric === 'percent') {
      const totalPercent = aggregatedData.reduce((sum, item) => sum + item.percent, 0);
      
      // Normalize percentages
      if (totalPercent > 0) {
        aggregatedData.forEach(item => {
          item.percent = (item.percent / totalPercent) * 100;
        });
      }
    }
        
    // Sort and get top N blocks based on selected metric
    const sortedData = [...aggregatedData].sort((a, b) => {
      // For position, lower is better, so sort ascending
      if (selectedMetric === 'avg_position') {
        return a[selectedMetric] - b[selectedMetric];
      }
      // For count and percent, higher is better, so sort descending
      return b[selectedMetric] - a[selectedMetric];
    }).slice(0, topN);
    
    if (chartType === 'bar') {
      return [{
        x: sortedData.map(item => item.block_type),
        y: sortedData.map(item => item[selectedMetric]),
        type: 'bar',
        marker: {
          color: sortedData.map(item => getBlockColor(item.block_type))
        }
      }];
    } else if (chartType === 'pie') {
      const uniqueBlockTypes = {};
      for (const item of sortedData) {
        if (!uniqueBlockTypes[item.block_type]) {
          uniqueBlockTypes[item.block_type] = item;
        }
      }
      const uniqueSortedData = Object.values(uniqueBlockTypes);
    
      // Return a single pie chart
      return [{
        type: 'pie',
        labels: uniqueSortedData.map(item => item.block_type),
        values: uniqueSortedData.map(item => item[selectedMetric]),
        textinfo: 'percent',
        textposition: 'auto',
        hoverinfo: 'label+value+percent',
        marker: {
          colors: uniqueSortedData.map(item => getBlockColor(item.block_type))
        }
      }];
    } else if (chartType === 'treemap') {
      return [{
        type: 'treemap',
        labels: sortedData.map(item => item.block_type),
        parents: sortedData.map(() => ''),
        values: sortedData.map(item => item[selectedMetric]),
        marker: {
          colors: sortedData.map(item => getBlockColor(item.block_type))
        }
      }];
    }
    
    return null;
  };

  // Create chart for selected block
  const createBlockDetailChart = (blockType: string) => {
    // Filter data only show the selected block type
    const blockData = blockSummaries.filter(item => item.block_type === blockType);
    
    if (chartType === 'bar') {
      return [{
        x: uniqueSites,
        y: uniqueSites.map(site => {
          const siteData = blockData.find(item => item.site === site);
          return siteData ? (selectedMetric === 'count' ? siteData.count : 
                            selectedMetric === 'percent' ? siteData.percent :
                            siteData.avg_position) : 0;
        }),
        type: 'bar',
        marker: {
          color: getBlockColor(blockType)
        }
      }];
    } else if (chartType === 'pie') {
      // Create multiple mini pie charts - one for each topic/site
      const miniPieCharts = [];

      const sortedSites = [...uniqueSites].slice(0, 12);
      
      sortedSites.forEach((site, index) => {
        const siteData = blockSummaries.filter(item => item.site === site);
        
        const row = Math.floor(index / 3);
        const col = index % 3;

        miniPieCharts.push({
          type: 'pie',
          domain: { 
            row: row, 
            column: col
          },
          labels: siteData.map(item => item.block_type),
          values: siteData.map(item => item.count), // Use count for proportions
          textinfo: 'none', 
          hoverinfo: 'label+percent', // Show info on hover
          title: {
            text: site,
            font: { size: 10 }
          },
          showlegend: false,
          marker: {
            colors: siteData.map(item => 
              // If this is the selected block type, use its color, otherwise use gray
              item.block_type === blockType 
                ? getBlockColor(item.block_type) 
                : 'rgba(200,200,200,0.3)'
            )
          }
        });
      });
      
      return miniPieCharts;
    } else if (chartType === 'treemap') {
      return [{
        type: 'treemap',
        labels: uniqueSites,
        parents: uniqueSites.map(() => blockType),
        values: uniqueSites.map(site => {
          const siteData = blockData.find(item => item.site === site);
          return siteData ? (selectedMetric === 'count' ? siteData.count : 
                            selectedMetric === 'percent' ? siteData.percent :
                            siteData.avg_position) : 0;
        }),
        marker: {
          colors: uniqueSites.map((_, i) => {
            const opacity = 0.4 + (i * 0.05);
            return `${getBlockColor(blockType).replace('0.8', opacity.toString())}`;
          })
        },
        branchvalues: 'total'
      }];
    }
    
    return null;
  };

  // Get chart layout configuration for block detail view
  const getBlockDetailChartLayout = (blockType: string) => {
    const baseLayout = {
      autosize: true,
      height: 500, 
      margin: { t: 30, b: 40, l: 30, r: 30 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        color: '#1f2937',
      }
    };
    
    if (chartType === 'bar') {
      return {
        ...baseLayout,
        title: {
          text: `${blockType} by ${selectedMetric === 'count' ? 'Count' : selectedMetric === 'percent' ? 'Percentage' : 'Position'} Across Sites`,
          font: { size: 16 }
        },
        xaxis: {
          title: 'Site',
          automargin: true
        },
        yaxis: {
          title: selectedMetric === 'count' 
            ? 'Count' 
            : selectedMetric === 'percent' 
              ? 'Percentage (%)' 
              : 'Average Position'
        }
      };
    } else if (chartType === 'pie') {
      // Grid layout for multiple mini pies
      return {
        ...baseLayout,
        title: {
          text: `${blockType} - Block Type Distribution by Site`,
          font: { size: 16 }
        },
        grid: {
          rows: 4,     
          columns: 3,  
          pattern: 'independent'
        },
        showlegend: false
      };
    } else if (chartType === 'treemap') {
      return {
        ...baseLayout,
        title: {
          text: `${blockType} by ${selectedMetric === 'count' ? 'Count' : selectedMetric === 'percent' ? 'Percentage' : 'Position'} Across Sites`,
          font: { size: 16 }
        }
      };
    }
    
    return baseLayout;
  };

  const getChartLayout = () => {
    const baseLayout = {
      autosize: true,
      height: 570,
      margin: { t: 10, b: 40, l: 60, r: 10 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        color: '#1f2937',
      }
    };
    
    // Add specific layout properties based on chart type
    if (chartType === 'bar') {
      return {
        ...baseLayout,
        xaxis: {
          title: 'Block Type',
          automargin: true
        },
        yaxis: {
          title: selectedMetric === 'count' 
            ? 'Count' 
            : selectedMetric === 'percent' 
              ? 'Percentage (%)' 
              : 'Average Position'
        }
      };
    } else if (chartType === 'pie') {
      return {
        ...baseLayout,
        legend: {
          orientation: 'h',
          y: -0.1
        }
      };
    } else if (chartType === 'treemap') {
      return {
        ...baseLayout
      };
    }
    
    return baseLayout;
  };
// Visualize blocks in the answer
const visualizeBlocks = () => {
  if (!randomSample) return null;
  
  const blocks = randomSample.blocks;
  const totalBlocks = blocks.length;
  
  // Create a visual representation of blocks by position
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {blocks.map((block, idx) => (
        <div
          key={`block-${idx}-${block.type}`}
          className={`h-6 rounded cursor-pointer transition-all flex items-center justify-start pl-1 ${
            activeBlocks.has(block.type) 
              ? 'border border-white shadow-sm' 
              : 'opacity-30'
          }`}
          style={{ 
            backgroundColor: getBlockColor(block.type),
            width: `${Math.max(3, (typeof block.text === 'string' ? block.text.split(/\s+/).length : 0) / 20 * 100)}px`,
          }}
          onClick={() => toggleBlock(block.type)}
          title={`${block.type}: ${typeof block.text === 'string' ? block.text.split(/\s+/).length : 0} words`}
          >
          <span className="text-white text-xs text-left">
          {typeof block.text === 'string' && block.text.split(/\s+/).length > 10 ? block.type : ''}
          </span>
        </div>
      ))}
      
      {totalBlocks === 0 && (
        <div className="text-gray-500 text-sm italic">
          No blocks available to visualize.
        </div>
      )}
    </div>
  );
};

  return (
    <div className="container mx-auto p-4 text-gray-900">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Explanation Analysis</h1>

        <div className="mt-4 p-4 border-l-4 border-blue-500 bg-blue-50 rounded">
          <p className="text-gray-700">
            <span className="font-semibold"></span> This tool visualizes how different explanation strategies are 
            used across content domains. Hover over block types for detailed statistics; click to see distribution across sites. 
            Also see examples from the dataset at the bottom!
          </p>
        </div>
      </div>
      
      {/* Tab Navigation */}
<div className="flex border-b border-gray-200 mt-6">
  <Link
    href="/"
    className="py-3 px-6 font-medium text-blue-600 border-b-2 border-blue-600"
  >
    Analysis
  </Link>
  <Link
    href="/explorer"
    className="py-3 px-6 font-medium text-gray-500 hover:text-gray-700"
  >
    Explorer
  </Link>
</div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Combined Visualization Section */}
          <div className="space-y-6 bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-3 md:space-y-0">
              <h2 className="text-xl font-semibold">Explanation Blocks Analysis</h2>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Site:</label>
                  <select
                    value={selectedSite}
                    onChange={handleSiteChange}
                    className="px-2 py-1 border rounded text-sm bg-white"
                  >
                    <option value="all">All Sites</option>
                    {uniqueSites.map(site => (
                      <option key={site} value={site}>{site}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Metric:</label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="px-2 py-1 border rounded text-sm bg-white"
                  >
                    <option value="count">Count</option>
                    <option value="percent">Percentage</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Top:</label>
                  <select
                    value={topN}
                    onChange={(e) => setTopN(parseInt(e.target.value))}
                    className="px-2 py-1 border rounded text-sm bg-white"
                  >
                    <option value="3">3</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Chart:</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="px-2 py-1 border rounded text-sm bg-white"
                  >
                    <option value="bar">Bar</option>
                    <option value="pie">Pie</option>
                    <option value="treemap">Treemap</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main visualization - takes full width when no detail, 2/3 when detail is shown */}
              <div className={`bg-white rounded-md overflow-hidden shadow-inner p-1 ${selectedBlockType ? 'lg:w-2/3' : 'w-full'}`}>
                {createEnhancedChart() && (
                  <Plot
                    data={createEnhancedChart() || []}
                    layout={getChartLayout()}
                    config={{
                      responsive: true,
                      toImageButtonOptions: {
                        format: 'png',
                        filename: 'block_type_chart',
                        height: 500,
                        width: 900,
                        scale: 2
                      }
                    }}
                    style={{ width: '100%' }}
                    onClick={(data) => {
                      if (data.points && data.points.length > 0) {
                        // Get the clicked block type
                        const clickedBlockType = data.points[0].label || data.points[0].data.name;
                        setSelectedBlockType(prev => prev === clickedBlockType ? null : clickedBlockType);
                      }
                    }}
                    onHover={(data) => {
                      if (data.points && data.points.length > 0) {
                        const blockType = data.points[0].label || data.points[0].data.name;
                        setHoveredBlockType(blockType);
                      }
                    }}
                    onUnhover={() => {
                      setHoveredBlockType(null);
                    }}
                  />
                )}
              </div>
              
              {/* Detail visualization - only shown when a block is selected */}
              {selectedBlockType && (
                <div className="bg-white rounded-md overflow-hidden shadow-inner p-4 lg:w-1/3">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <span 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: getBlockColor(selectedBlockType) }}
                      />
                      {selectedBlockType} Across Sites
                    </h3>
                    <button
                      onClick={() => setSelectedBlockType(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Block-specific visualization */}
                  <div className="h-[500px]">
                    <Plot
                      data={createBlockDetailChart(selectedBlockType) || []}
                      layout={getBlockDetailChartLayout(selectedBlockType)}
                      config={{ responsive: true }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                  
                  {/* Additional statistics about selected block */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-500">Total Count</div>
                        <div className="font-bold text-xl">{calculateBlockTypeStats(selectedBlockType).totalCount}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Avg Percentage</div>
                        <div className="font-bold text-xl">{calculateBlockTypeStats(selectedBlockType).avgPercent}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Avg Position</div>
                        <div className="font-bold text-xl">{calculateBlockTypeStats(selectedBlockType).avgPosition}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Block Type Legend with Hover Details */}
            <div className="mt-6">
              <h3 className="text-base font-semibold mb-3">Block Types (Hover for details, click to analyze)</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(blockSummaries.map(item => item.block_type))).sort().map(blockType => (
                  <div key={blockType} className="relative">
                    <button
                      onMouseEnter={() => setHoveredBlockType(blockType)}
                      onMouseLeave={() => setHoveredBlockType(null)}
                      onClick={() => setSelectedBlockType(prev => prev === blockType ? null : blockType)}
                      className={`px-3 py-1 text-xs rounded border transition-all ${
                        selectedBlockType === blockType
                          ? 'ring-2 ring-blue-500 shadow-sm'
                          : ''
                      }`}
                      style={{
                        backgroundColor: getBlockColor(blockType),
                        color: 'white',
                        borderColor: 'rgba(0,0,0,0.3)'
                      }}
                    >
                      {blockType}
                    </button>
                    
                    {/* Hover Details Popup */}
                    {hoveredBlockType === blockType && (
                      <div className="absolute z-10 left-0 top-full mt-1 w-64 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
                        <div className="flex items-center mb-2">
                          <span 
                            className="w-4 h-4 rounded-full mr-2" 
                            style={{ backgroundColor: getBlockColor(blockType) }}
                          />
                          <h3 className="font-semibold">{blockType} Details</h3>
                        </div>
                        
                        {(() => {
                          const stats = calculateBlockTypeStats(blockType);
                          return (
                            <>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="text-sm">
                                  <div className="text-gray-500">Total Count</div>
                                  <div className="font-bold">{stats.totalCount}</div>
                                </div>
                                <div className="text-sm">
                                  <div className="text-gray-500">Average %</div>
                                  <div className="font-bold">{stats.avgPercent}%</div>
                                </div>
                                <div className="text-sm">
                                  <div className="text-gray-500">Avg Position</div>
                                  <div className="font-bold">{stats.avgPosition}</div>
                                </div>
                              </div>
                              
                              <div className="text-xs text-gray-500">Top sites:</div>
                              <div className="max-h-28 overflow-y-auto">
                                {stats.sites
                                  .sort((a, b) => b.count - a.count)
                                  .slice(0, 3)
                                  .map(site => (
                                    <div key={`${site.site}-${site.count}-${site.percent}`} className="text-xs mt-1 bg-gray-100 p-1 rounded">
                                      <span className="font-medium">{site.site}</span>: {site.count} ({site.percent}%)
                                    </div>
                                  ))
                                }
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Random sample viewer */}
          <div className="space-y-4 bg-white p-6 rounded-lg shadow-md mt-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
              <h2 className="text-xl font-semibold">
                Random Answer Viewer
                {qaSamples.length < qaSamples.length && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({qaSamples.length} matches)
                  </span>
                )}
              </h2>
              
              <button
                onClick={getRandomSample}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center"
              >
                <span>Shuffle</span>
                <span className="ml-2 text-lg">🔀</span>
              </button>
            </div>
            
            {randomSample && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center mb-3">
                    <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded mr-2">
                      {randomSample.site}
                    </div>
                    {randomSample.audience_level && (
                      <div className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded mr-2">
                        {randomSample.audience_level}
                      </div>
                    )}
                    {randomSample.tone && (
                      <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        {randomSample.tone}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{randomSample.question_title}</h3>
                  
                  <div className="text-gray-700 whitespace-pre-line max-h-40 overflow-y-auto border-t border-gray-200 pt-3 mt-3 text-sm mb-3">
                    {randomSample.question_body.length > 300 
                      ? randomSample.question_body.substring(0, 300) + '...' 
                      : randomSample.question_body}
                  </div>
                  
                  <button
                    className="text-blue-600 text-xs hover:underline"
                    onClick={() => {
                      const detailsElement = document.getElementById('question-details');
                      if (detailsElement) {
                        detailsElement.open = !detailsElement.open;
                      }
                    }}
                  >
                    {document.getElementById('question-details')?.open 
                      ? 'Show less' 
                      : 'Show full question'}
                  </button>
                  
                  <details id="question-details" className="mt-3">
                    <summary className="sr-only">Full question</summary>
                    <div className="text-gray-700 whitespace-pre-line text-sm border-t border-gray-200 pt-3 mt-1">
                      {randomSample.question_body}
                    </div>
                  </details>
                </div>
                
                {/* Block visualization */}
<div className="space-y-4">
  <div className="mt-4">
    <h4 className="text-base font-semibold mb-2">Block Distribution</h4>
    {visualizeBlocks()}
  </div>
</div>
                
                {/* Display selected blocks */}
                <div className="space-y-4 mt-6">
                  <h4 className="text-base font-semibold flex items-center">
                    <span>Answer Blocks</span>
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({randomSample.blocks.filter(b => activeBlocks.has(b.type)).length} of {randomSample.blocks.length} blocks)
                    </span>
                  </h4>
                  
                  {randomSample.blocks
                    .filter(b => activeBlocks.has(b.type))
                    .map((block, idx) => {
                      const blockTypeIndex = Array.from(new Set(randomSample.blocks.map(b => b.type)))
                        .indexOf(block.type);
                      
                      return (
                        <div 
                          key={idx} 
                          className="p-4 border rounded-md bg-white shadow-sm hover:shadow-md transition-shadow border-l-4"
                          style={{ 
                            borderLeftColor: getBlockColor(block.type)
                          }}
                        >
                          <div 
                            className="text-xs font-semibold mb-2 uppercase tracking-wide flex items-center"
                            style={{ color: getBlockColor(block.type) }}
                          >
                            <span>{block.type}</span>
                            <span className="ml-2 text-gray-500 lowercase normal-case">
                              {typeof block.text === 'string' ? block.text.split(/\s+/).length : 0} words
                            </span>
                          </div>
                          <div className="text-gray-800 whitespace-pre-line">
                            {block.text}
                          </div>
                        </div>
                      );
                    })}
                    
                  {randomSample.blocks.filter(b => activeBlocks.has(b.type)).length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                      No blocks selected. Please select at least one block type above.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Stats Section */}
          <div className="space-y-4 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold">Site Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {uniqueSites.map(site => {
  const siteBlocks = blockSummaries.filter(b => b.site === site);
  // Get unique block types sorted by count (highest first)
  const uniqueBlockTypes = Array.from(new Set(siteBlocks.map(b => b.block_type)));
  const topBlocks = uniqueBlockTypes
    .map(type => {
      const blocksOfType = siteBlocks.filter(b => b.block_type === type);
      const totalCount = blocksOfType.reduce((sum, b) => sum + b.count, 0);
      const avgPercent = blocksOfType.reduce((sum, b) => sum + b.percent, 0) / blocksOfType.length;
      return { block_type: type, count: totalCount, percent: avgPercent };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  const totalBlocks = siteBlocks.reduce((sum, block) => sum + block.count, 0);
  
  return (
    <div 
      key={site} 
      className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <h3 className="font-semibold text-lg mb-2">{site}</h3>
      
      {/* Top blocks first */}
      <div className="flex flex-wrap gap-1 mb-3">
        {topBlocks.map((block, idx) => (
          <span 
            key={`${site}-${block.block_type}-${idx}`}
            className="px-2 py-1 rounded text-xs text-white flex items-center"
            style={{ backgroundColor: getBlockColor(block.block_type) }}
          >
            {block.block_type}
            <span className="ml-1 opacity-80">({Math.round(block.percent)}%)</span>
          </span>
        ))}
      </div>
      
      <div className="text-sm text-gray-600 space-y-2">
        <div>
          <span className="font-medium">Total Blocks: </span>
          {totalBlocks}
        </div>
        <div>
          <span className="font-medium">Unique Types: </span>
          {new Set(siteBlocks.map(b => b.block_type)).size}
        </div>
      </div>
    </div>
  );
})}
            </div>
          </div>
        </>
      )}
    </div>
  );
}