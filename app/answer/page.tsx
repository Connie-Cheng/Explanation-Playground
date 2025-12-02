'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useState } from 'react';

// Use dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false }) as any

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

export default function AnswerPage() {
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
        
        // Set active blocks to all blocks in this sample
        setActiveBlocks(new Set(sample.blocks.map((b: Block) => b.type)));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Search functionality -> I removed this as a feature because it just seemed extra, but leaving here just in case
  const filteredSamples = useMemo(() => {
    if (!searchTerm.trim()) {
      return qaSamples;
    }
    
    const term = searchTerm.toLowerCase();
    return qaSamples.filter(sample => 
      sample.question_title.toLowerCase().includes(term) || 
      sample.question_body.toLowerCase().includes(term) ||
      sample.answer_body.toLowerCase().includes(term) ||
      sample.blocks.some(block => 
        block.type.toLowerCase().includes(term) || 
        block.text.toLowerCase().includes(term)
      )
    );
  }, [qaSamples, searchTerm]);

  const getRandomSample = () => {
    if (filteredSamples.length === 0) return;
    
    const samples = selectedSite === 'all' 
      ? filteredSamples 
      : filteredSamples.filter(sample => sample.site === selectedSite);
    
    if (samples.length === 0) {
      alert(`No samples available for site: ${selectedSite} with search term: ${searchTerm}`);
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

  const getBlockColor = (blockType: string, index: number = 0) => {
    // Color palette - I also had dark mode idea at one point but too much work to remove
    const blockColors: { [key: string]: string } = {
      'Elaboration': 'hsla(120, 70%, 50%, 0.8)',
      'Claim': 'hsla(0, 70%, 50%, 0.8)',
      'Procedure': 'hsla(240, 70%, 60%, 0.8)',
      'Example': 'hsla(60, 70%, 50%, 0.8)',
      'Context': 'hsla(30, 70%, 50%, 0.8)',
      'Implication': 'hsla(180, 70%, 50%, 0.8)',
      'Definition': 'hsla(270, 70%, 60%, 0.8)',
      'Comparison': 'hsla(200, 70%, 50%, 0.8)',
      'Citation': 'hsla(300, 70%, 50%, 0.8)',
      'Evidence': 'hsla(80, 70%, 50%, 0.8)',
      'Question': 'hsla(330, 70%, 50%, 0.8)',
      'Summary': 'hsla(150, 70%, 50%, 0.8)'
    };

     return blockColors[blockType] || '#999'
  };

  //There are some remnants of dark mode and other features I got halfway through integrating or decided I did not want anymore because they are peripheral, I will clean when I have more time!

  const createEnhancedChart = () => {
    if (!blockSummaries || blockSummaries.length === 0) return null;
    
    const sitesToDisplay = selectedSite === 'all' ? uniqueSites : [selectedSite];
    const topBlocksPerSite: {[key: string]: BlockSummary[]} = {};
    
    sitesToDisplay.forEach(site => {
      const siteSummaries = blockSummaries.filter(
        summary => summary.site === site
      );
      
      // Sort by the selected metric
      const sorted = [...siteSummaries].sort((a, b) => {
        if (selectedMetric === 'count') {
          return b.count - a.count;
        } else if (selectedMetric === 'percent') {
          return b.percent - a.percent;
        } else {
          // avg_position - for this, lower value is better
          return a.avg_position - b.avg_position;
        }
      });
      
      topBlocksPerSite[site] = sorted.slice(0, topN);
    });
    
    // Structure data for Plotly based on chart type
    if (chartType === 'bar') {
      const plotData = sitesToDisplay.map(site => {
        const blocks = topBlocksPerSite[site];
        return {
          type: 'bar',
          name: site,
          x: blocks.map(block => block.block_type),
          y: blocks.map(block => selectedMetric === 'count' ? block.count : 
                           selectedMetric === 'percent' ? block.percent : 
                           block.avg_position),
          text: blocks.map(block => 
            `Type: ${block.block_type}<br>` +
            `Count: ${block.count}<br>` +
            `Percent: ${block.percent.toFixed(2)}%<br>` +
            `Avg Position: ${block.avg_position.toFixed(2)}`
          ),
          hoverinfo: 'text',
          marker: {
            color: blocks.map((block, i) => getBlockColor(block.block_type, i)),
            line: {
              color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
              width: 1
            }
          }
        };
      });
      
      return plotData;
    } 
    else if (chartType === 'pie') {
      // Create a pie chart for each site
      const plotData = sitesToDisplay.map(site => {
        const blocks = topBlocksPerSite[site];
        return {
          type: 'pie',
          name: site,
          title: { text: site },
          domain: {
            row: 0,
            column: sitesToDisplay.indexOf(site)
          },
          labels: blocks.map(block => block.block_type),
          values: blocks.map(block => selectedMetric === 'count' ? block.count : 
                         selectedMetric === 'percent' ? block.percent : 
                         1 / block.avg_position), // Invert avg_position for pie chart
          text: blocks.map(block => 
            `Type: ${block.block_type}<br>` +
            `Count: ${block.count}<br>` +
            `Percent: ${block.percent.toFixed(2)}%<br>` +
            `Avg Position: ${block.avg_position.toFixed(2)}`
          ),
          hoverinfo: 'text+label+percent',
          textinfo: 'label+percent',
          marker: {
            colors: blocks.map((block, i) => getBlockColor(block.block_type, i)),
            line: {
              color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
              width: 1
            }
          }
        };
      });
      
      return plotData;
    }
    else if (chartType === 'treemap') {
      // Create treemap
      const allValues = [];
      const allLabels = [];
      const allParents = [];
      const allColors = [];
      
      sitesToDisplay.forEach(site => {
        const blocks = topBlocksPerSite[site];
        
        // Add site as a parent
        allValues.push(0);
        allLabels.push(site);
        allParents.push('');
        allColors.push(darkMode ? 'rgba(80,80,80,0.8)' : 'rgba(220,220,220,0.8)');
        
        // Add block type as a child
        blocks.forEach((block, i) => {
          allValues.push(selectedMetric === 'count' ? block.count : 
                      selectedMetric === 'percent' ? block.percent : 
                      1 / block.avg_position); // Invert avg_position for treemap
          allLabels.push(block.block_type);
          allParents.push(site);
          allColors.push(getBlockColor(block.block_type, i));
        });
      });
      
      return [{
        type: 'treemap',
        values: allValues,
        labels: allLabels,
        parents: allParents,
        marker: {
          colors: allColors,
          line: {
            color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
            width: 1
          }
        },
        text: allLabels.map((label, i) => {
          if (allParents[i] === '') return label;
          
          const block = blockSummaries.find(b => 
            b.site === allParents[i] && b.block_type === label
          );
          
          if (!block) return label;
          
          return `Type: ${block.block_type}<br>` +
                 `Count: ${block.count}<br>` +
                 `Percent: ${block.percent.toFixed(2)}%<br>` +
                 `Avg Position: ${block.avg_position.toFixed(2)}`;
        }),
        hoverinfo: 'text+label',
        textinfo: 'label+value'
      }];
    }
    
    return null;
  };

  // Create chart layout
  const getChartLayout = () => {
    const baseLayout = {
      height: 500,
      title: `Top ${topN} Block Types by ${selectedMetric === 'count' ? 'Count' : 
                            selectedMetric === 'percent' ? 'Percentage' : 
                            'Position'}`,
      paper_bgcolor: darkMode ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)',
      plot_bgcolor: darkMode ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)',
      font: {
        color: darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)'
      }
    };
    
    if (chartType === 'bar') {
      return {
        ...baseLayout,
        barmode: 'group',
        xaxis: { 
          title: 'Block Type',
          gridcolor: darkMode ? 'rgba(80,80,80,0.3)' : 'rgba(220,220,220,0.8)'
        },
        yaxis: { 
          title: selectedMetric === 'count' ? 'Count' : 
                 selectedMetric === 'percent' ? 'Percentage (%)' : 
                 'Avg Position',
          gridcolor: darkMode ? 'rgba(80,80,80,0.3)' : 'rgba(220,220,220,0.8)'
        },
        legend: {
          title: { text: 'Site' },
          bgcolor: darkMode ? 'rgba(50,50,50,0.7)' : 'rgba(255,255,255,0.7)'
        }
      };
    } 
    else if (chartType === 'pie') {
      return {
        ...baseLayout,
        grid: {
          rows: 1,
          columns: uniqueSites.length
        }
      };
    }
    else if (chartType === 'treemap') {
      return {
        ...baseLayout,
        title: `Block Types by ${selectedMetric === 'count' ? 'Count' : 
                              selectedMetric === 'percent' ? 'Percentage' : 
                              'Position'} (Treemap)`
      };
    }
    
    return baseLayout;
  };

  // Visualize block distribution in the answer
  const visualizeBlocks = () => {
    if (!randomSample) return null;
    
    // Filter blocks based on active selection
    const filteredBlocks = randomSample.blocks.filter(b => activeBlocks.has(b.type));
    
    // Calculate block lengths for visualization
    const blockLengths = filteredBlocks.map(b => b.text.split(/\s+/).length);
    const blockLabels = filteredBlocks.map(b => b.type);
    
    if (blockLengths.length === 0) return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No blocks selected. Please select at least one block type.
      </div>
    );
    
    return (
      <div className="h-20 relative w-full bg-gray-100 dark:bg-gray-800 rounded overflow-hidden shadow-inner">
        <div className="absolute left-0 inset-y-0 flex items-center px-2 bg-gray-200 dark:bg-gray-700 font-bold text-sm z-10">
          Answer
        </div>
        <div className="h-full ml-16 flex items-center">
          {blockLengths.map((length, i) => {
            const blockType = blockLabels[i];
            const blockTypeIndex = Array.from(new Set(randomSample.blocks.map(b => b.type)))
              .indexOf(blockType);
              
            return (
              <div 
                key={i} 
                className="h-full flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                style={{ 
                  width: `${(length / blockLengths.reduce((a, b) => a + b, 0)) * 100}%`,
                  backgroundColor: getBlockColor(blockType, blockTypeIndex),
                  minWidth: '20px'
                }}
                title={`${blockType} (${length} words)`}
              >
                {length > 20 ? blockType : ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Calculate block type stats for currently displayed answer
  const calculateBlockStats = () => {
    if (!randomSample) return null;
    
    const blockTypeCounts: {[key: string]: number} = {};
    const blockTypeWords: {[key: string]: number} = {};
    
    randomSample.blocks.forEach(block => {
      const type = block.type;
      blockTypeCounts[type] = (blockTypeCounts[type] || 0) + 1;
      blockTypeWords[type] = (blockTypeWords[type] || 0) + typeof block.text === 'string' ? block.text.split(/\s+/).length : 0
    });
    
    const blockTypes = Object.keys(blockTypeCounts);
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {blockTypes.map(type => {
          const count = blockTypeCounts[type];
          const words = blockTypeWords[type];
          const typeIndex = Array.from(new Set(randomSample?.blocks.map(b => b.type) || []))
            .indexOf(type);
          
          return (
            <div 
              key={type}
              className={`p-3 rounded shadow-sm ${
                activeBlocks.has(type) 
                  ? 'bg-white dark:bg-gray-800 border-l-4' 
                  : 'bg-gray-100 dark:bg-gray-700 opacity-70'
              }`}
              style={
                activeBlocks.has(type)
                  ? { borderLeftColor: getBlockColor(type, typeIndex) }
                  : {}
              }
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{type}</span>
                <span 
                  className="text-xs px-2 py-1 rounded text-white"
                  style={{ backgroundColor: getBlockColor(type, typeIndex) }}
                >
                  {count} block{count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {words} words ({Math.round((words / randomSample.blocks.reduce(
                  (sum, b) => sum + b.text.split(/\s+/).length, 0
                )) * 100)}% of answer)
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8 bg-white text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <h1 className="text-2xl md:text-3xl font-bold">Answer Block Viewer</h1>
        
        <div className="mb-6">
  <h1 className="text-2xl md:text-3xl font-bold">Answer Block Viewer</h1>
</div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Block type distribution visualization */}
          <div className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row justify-between md:items-center space-y-3 md:space-y-0">
              <h2 className="text-xl font-semibold">Block Types Analysis</h2>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Site:</label>
                  <select
                    value={selectedSite}
                    onChange={handleSiteChange}
                    className="px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    className="px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="count">Count</option>
                    <option value="percent">Percentage</option>
                    <option value="avg_position">Position</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm">Top:</label>
                  <select
                    value={topN}
                    onChange={(e) => setTopN(parseInt(e.target.value))}
                    className="px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    className="px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="bar">Bar</option>
                    <option value="pie">Pie</option>
                    <option value="treemap">Treemap</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-md overflow-hidden shadow-inner p-1">
              {createEnhancedChart() && (
                <Plot
                  data={createEnhancedChart()}
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
                />
              )}
            </div>
          </div>
          
          {/* Random sample viewer */}
          <div className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
              <h2 className="text-xl font-semibold">
                Random Answer Viewer
                {filteredSamples.length < qaSamples.length && (
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({filteredSamples.length} matches)
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
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-3">
                    <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded mr-2">
                      {randomSample.site}
                    </div>
                    {randomSample.audience_level && (
                      <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded mr-2">
                        {randomSample.audience_level}
                      </div>
                    )}
                    {randomSample.tone && (
                      <div className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold rounded">
                        {randomSample.tone}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{randomSample.question_title}</h3>
                  
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line max-h-40 overflow-y-auto border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 text-sm mb-3">
                    {randomSample.question_body.length > 300 
                      ? randomSample.question_body.substring(0, 300) + '...' 
                      : randomSample.question_body}
                  </div>
                  
                  <button
                    className="text-blue-600 dark:text-blue-400 text-xs hover:underline"
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
                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line text-sm border-t border-gray-200 dark:border-gray-700 pt-3 mt-1">
                      {randomSample.question_body}
                    </div>
                  </details>
                </div>
                
                {/* Block type distribution and statistics */}
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
                    <h4 className="text-base font-semibold">Answer Block Analysis</h4>
                    
                    <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                      {Array.from(new Set(randomSample.blocks.map(b => b.type))).map((type, index) => (
                        <button
                          key={type}
                          onClick={() => toggleBlock(type)}
                          className={`px-3 py-1 text-xs rounded border transition-all ${
                            activeBlocks.has(type)
                              ? 'text-white shadow-sm'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                          } hover:shadow`}
                          style={{
                            backgroundColor: activeBlocks.has(type) 
                              ? getBlockColor(type, index) 
                              : undefined
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Block statistics */}
                  {calculateBlockStats()}
                  
                  {/* Visual block distribution */}
                  <div className="mt-4">
                    <h4 className="text-base font-semibold mb-2">Block Distribution</h4>
                    {visualizeBlocks()}
                  </div>
                </div>
                
                {/* Display selected blocks */}
                <div className="space-y-4 mt-6">
                  <h4 className="text-base font-semibold flex items-center">
                    <span>Answer Blocks</span>
                    <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
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
                          className="p-4 border rounded-md bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow border-l-4 dark:border-l-4"
                          style={{ 
                            borderLeftColor: getBlockColor(block.type, blockTypeIndex)
                          }}
                        >
                          <div 
                            className="text-xs font-semibold mb-2 uppercase tracking-wide flex items-center"
                            style={{ color: getBlockColor(block.type, blockTypeIndex) }}
                          >
                            <span>{block.type}</span>
                            <span className="ml-2 text-gray-500 dark:text-gray-400 lowercase normal-case">
                              {block.text.split(/\s+/).length} words
                            </span>
                          </div>
                          <div className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                            {block.text}
                          </div>
                        </div>
                      );
                    })}
                    
                  {randomSample.blocks.filter(b => activeBlocks.has(b.type)).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                      No blocks selected. Please select at least one block type above.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Statistics Section */}
          <div className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold">Site Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {uniqueSites.map(site => {
                const siteBlocks = blockSummaries.filter(b => b.site === site);
                const topBlock = [...siteBlocks].sort((a, b) => b.count - a.count)[0];
                const totalBlocks = siteBlocks.reduce((sum, block) => sum + block.count, 0);
                
                return (
                  <div 
                    key={site} 
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                  >
                    <h3 className="font-semibold text-lg mb-2">{site}</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                      <div>
                        <span className="font-medium">Top Block: </span>
                        <span 
                          className="px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: getBlockColor(topBlock?.block_type || '', 0) }}
                        >
                          {topBlock?.block_type || 'N/A'}
                        </span>
                      </div>
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
    </main>
  )