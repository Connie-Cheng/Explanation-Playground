'use client'

import { useState } from 'react';

export function BlockHoverDetails({
  blockSummaries,
  calculateBlockTypeStats,
  getBlockColor,
  onBlockSelect
}) {
  const [hoveredBlockType, setHoveredBlockType] = useState(null);

  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold mb-3">Block Types (Hover for details, click to analyze)</h3>
      <div className="flex flex-wrap gap-2">
        {/* Loop + create button */}
        {Array.from(new Set(blockSummaries.map(item => item.block_type))).sort().map(blockType => (
          <div key={blockType} className="relative">
            {/* block type name */}
            <button
              onMouseEnter={() => setHoveredBlockType(blockType)}
              onMouseLeave={() => setHoveredBlockType(null)}
              onClick={() => onBlockSelect(blockType)}
              className="px-3 py-1 text-xs rounded border transition-all"
              style={{
                backgroundColor: getBlockColor(blockType),
                color: 'white',
                borderColor: 'rgba(0,0,0,0.3)'
              }}
            >
              {blockType}
            </button>
            
            {/* hovwer popup */}
            {hoveredBlockType === blockType && (
              <div className="absolute z-10 left-0 top-full mt-1 w-64 p-4 bg-white rounded-lg shadow-lg border border-gray-200">
                <div className="flex items-center mb-2">
                  <span 
                    className="w-4 h-4 rounded-full mr-2" 
                    style={{ backgroundColor: getBlockColor(blockType) }}
                  />
                  <h3 className="font-semibold">{blockType} Details</h3>
                </div>
                
                {/* calculates and shows stats about the block type */}
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
                            <div key={site.site} className="text-xs mt-1 bg-gray-100 p-1 rounded">
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
  );
}

// This function creates events for the chart to respond to hover
export function getHoverChartEvents(setHoveredBlockType) {
  return {
    onClick: undefined, // Remove click handler
    onHover: (data) => {
      if (data.points && data.points.length > 0) {
        const blockType = data.points[0].label || data.points[0].data.name;
        setHoveredBlockType(blockType);
      }
    },
    onUnhover: () => {
      setHoveredBlockType(null);
    }
  };
}

// creates events for chart to respond to click and hover
export function getInteractiveChartEvents(setSelectedBlockType, setHoveredBlockType) {
  return {
    onClick: (data) => {
      if (data.points && data.points.length > 0) {
        // Get the clicked block type
        const clickedBlockType = data.points[0].label || data.points[0].data.name;
        setSelectedBlockType(prev => prev === clickedBlockType ? null : clickedBlockType);
      }
    },
    onHover: (data) => {
      if (data.points && data.points.length > 0) {
        const blockType = data.points[0].label || data.points[0].data.name;
        setHoveredBlockType(blockType);
      }
    },
    onUnhover: () => {
      setHoveredBlockType(null);
    }
  };
}

// which blocks to show based on which one is hovered
export function getTraceVisibilityFunction(hoveredBlockType) {
  return (blockType) => hoveredBlockType === null || hoveredBlockType === blockType;
}