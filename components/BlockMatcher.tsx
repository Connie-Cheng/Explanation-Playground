'use client'

import { useState, useEffect } from 'react'

interface Block {
  type: string
  text: string
}

interface BlockMatcherProps {
  answerBody: string
  blocks: Block[]
}

/**
 * A component that tries to match blocks to the answer text
 * This is a different approach than the page.tsx solution
 * It attempts to highlight parts of the answer text based on semantic similarity to blocks
 */
export default function BlockMatcher({ answerBody, blocks }: BlockMatcherProps) {
  const [highlightedText, setHighlightedText] = useState<React.ReactNode[]>([])

  // Function to get a color for block types
  const getBlockColor = (blockType: string, index: number = 0) => {
    const blockColors: {[key: string]: string} = {
      'Elaboration': 'rgba(120, 220, 120, 0.2)',
      'Claim': 'rgba(220, 120, 120, 0.2)',
      'Procedure': 'rgba(120, 120, 220, 0.2)',
      'Example': 'rgba(220, 220, 120, 0.2)',
      'Context': 'rgba(220, 180, 120, 0.2)',
      'Implication': 'rgba(120, 220, 220, 0.2)',
      'Definition': 'rgba(180, 120, 220, 0.2)',
      'Comparison': 'rgba(120, 180, 220, 0.2)',
      'Citation': 'rgba(220, 120, 220, 0.2)',
      'Evidence': 'rgba(180, 220, 120, 0.2)',
      'Question': 'rgba(220, 120, 180, 0.2)',
      'Summary': 'rgba(120, 220, 180, 0.2)'
    }
    
    return blockColors[blockType] || `hsla(${(index * 47) % 360}, 60%, 70%, 0.2)`
  }

  useEffect(() => {
    // This is a simplified approach to match blocks to text
    // In a real implementation, you might use more advanced text matching
    
    // Split answer into paragraphs
    const paragraphs = answerBody.split('\n\n').filter(p => p.trim())
    
    // Create a simple mapping of paragraphs to blocks based on position
    // This is just a heuristic - the real relationship might be more complex
    const highlightedParagraphs = paragraphs.map((paragraph, index) => {
      // Find the most likely block for this paragraph
      // This is a simplification - in real usage, you'd use a better matching algorithm
      const matchingBlock = blocks[index % blocks.length]
      
      if (!matchingBlock) {
        return <p key={index} className="mb-4">{paragraph}</p>
      }
      
      const blockStyle = {
        backgroundColor: getBlockColor(matchingBlock.type, index),
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '16px',
        position: 'relative' as const
      }
      
      return (
        <div key={index} style={blockStyle}>
          <div className="text-xs font-semibold mb-1 uppercase tracking-wide">
            {matchingBlock.type}
          </div>
          <p>{paragraph}</p>
          <div className="mt-2 text-xs text-gray-600 italic">
            Block summary: {matchingBlock.text}
          </div>
        </div>
      )
    })
    
    setHighlightedText(highlightedParagraphs)
  }, [answerBody, blocks])

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Text with Block Matching</h3>
      <div className="p-4 bg-white rounded shadow">
        <p className="text-sm mb-4 text-gray-600">
          Note: This is a demonstration of matching blocks to answer text. The blocks in the 
          dataset are not direct excerpts but rather summaries or classifications of the content.
        </p>
        <div className="text-gray-800">
          {highlightedText}
        </div>
      </div>
    </div>
  )
}