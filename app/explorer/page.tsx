'use client';
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TreeView from './TreeView'; 
import Link from 'next/link'

// Default reusable blocks
const defaultBlockTemplates = [
  { type: "Definition", color: "hsla(112, 95.60%, 17.60%, 0.80)", description: "Clarify what something means"},
  { type: "Example", color: "hsla(180, 99.20%, 49.00%, 0.80)", description: "Give a real-world instance"},
  { type: "Analogy", color: "hsla(325, 100.00%, 42.00%, 0.80)", description: "Make a comparison"},
  { type: "Claim", color: "hsla(39, 86.50%, 56.30%, 0.80)", description: "State an assertion"},
  { type: "Elaboration", color: "hsla(147, 66.20%, 54.70%, 0.80)", description: "Add supporting detail or context"},
  { type: "Procedure", color: "hsla(230, 98.10%, 20.40%, 0.80)", description: "Step-by-step instructions or methods"},
  { type: "Story", color: "hsla(302, 100.00%, 50.00%, 0.80)", description: "Narrative or illustrative scenario", },
  { type: "Implication", color: "hsla(219, 100.00%, 39.80%, 0.80)", description: "What follows logically or practically"},
  { type: "Hypothesis", color: "hsla(216, 100.00%, 49.80%, 0.80)", description: "A plausible guess or speculation"},
  { type: "Visual Description", color: "hsla(350, 100.00%, 75.10%, 0.80)", description: "Describe something visually"},
  { type: "Custom", color:"hsla(220, 15%, 80%, 0.8)", description: "Define your own block"}
];

function SortableBlock({ id, icon, type, description, fullText, onRemove, onGrow, onActivate, isActive, color, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id });

  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(description);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: color ? `${color.replace(/0\.80/, '0.15')}` : 'white',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg p-4 min-w-[220px] outline-none ring-0 shadow-none hover:shadow-md transition-all duration-200 text-sm flex-shrink-0 relative
        ${isActive ? '' : ''}`}
      
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onActivate) onActivate(id);
      }}
    >
      {/* Header with drag handle and buttons */}
      <div className="flex justify-between items-center mb-2">
        <div
          className="font-bold cursor-move flex items-center gap-1.5 text-gray-800"
          {...attributes}
          {...listeners}
        >
          <span className="text-lg">{icon}</span> 
          <span>{type}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGrow(id);
            }}
            className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-md hover:bg-green-100 transition-colors duration-150 flex items-center gap-1"
            title="Create a branch from this block"
          >
            <span className="text-sm">🌱</span> 
          </button>
          <button
    onClick={(e) => {
      e.stopPropagation();
      setIsEditing(!isEditing);
    }}
    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors duration-150"
    title="Edit this block"
  >
    ✏️
  </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded-md hover:bg-red-100 transition-colors duration-150"
            title="Remove this block"
          >
            ✕
          </button>
        </div>
      </div>
      {/* Description and expandable content */}
<div className="text-gray-600 text-sm">
  {isEditing ? (
    <input
      type="text"
      value={editedDescription}
      onChange={(e) => setEditedDescription(e.target.value)}
      onBlur={() => {
        setIsEditing(false);
        if (onEdit && editedDescription.trim()) {
          onEdit(id, editedDescription);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setIsEditing(false);
          if (onEdit && editedDescription.trim()) {
            onEdit(id, editedDescription);
          }
        }
      }}
      className="w-full border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
      autoFocus
      onClick={(e) => e.stopPropagation()}
    />
  ) : (
    <div
      onClick={() => setExpanded(!expanded)}
      className="cursor-pointer hover:text-gray-800 transition-colors duration-150"
    >
      {editedDescription}
      {expanded && fullText && (
        <div className="mt-2 text-sm text-gray-500 border-t pt-2 whitespace-pre-wrap">
          {fullText}
        </div>
      )}
    </div>
  )}
</div>
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-bl rounded-tr-lg">
          Active
        </div>
      )}
      
      {/* Instructions hint for double-click */}
      <div className="absolute bottom-1 right-1 text-gray-300 text-xs italic">
        Double-click to activate
      </div>
    </div>
  );
}

export default function Page() {
  // Main state
  const [explanationChain, setExplanationChain] = useState([]);
  const [customBlocks, setCustomBlocks] = useState([]);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [parallelTrains, setParallelTrains] = useState({});
  const [activeTrain, setActiveTrain] = useState("main");
  const [trainOutputs, setTrainOutputs] = useState({});
  const [explanationHistory, setExplanationHistory] = useState([]);
  const [selectedExplanations, setSelectedExplanations] = useState([null, null]);
  const [showComparison, setShowComparison] = useState(false);
  const [activeTab, setActiveTab] = useState("blocks"); 
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const blockTemplates = [...defaultBlockTemplates, ...customBlocks];
  const sensors = useSensors(useSensor(PointerSensor));

  // Helper to find block from anywhere in the data structure
  const findBlock = (id) => {
    const inMain = explanationChain.find(b => b.id === id);
    if (inMain) return inMain;
    
    // Search all parallel trains
    for (const parentId in parallelTrains) {
      const found = parallelTrains[parentId]?.find(b => b.id === id);
      if (found) return found;
    }
    
    return null;
  };

  // ➕ Add custom block type
  const handleAddCustom = () => {
    if (!customName || !customDesc) return;

    // Add a rando color for custom blocks
    const randomHue = Math.floor(Math.random() * 360);
    const newBlock = {
      type: customName,
      description: customDesc,
      icon: "",
      color: `hsla(${randomHue}, 85%, 45%, 0.80)`
    };

    setCustomBlocks([...customBlocks, newBlock]);
    
    // Also add an instance to the active train
    const blockInstance = {
      ...newBlock,
      id: `custom-${Date.now()}`
    };
    
    if (activeTrain === "main") {
      setExplanationChain(prev => [...prev, blockInstance]);
    } else {
      setParallelTrains(prev => ({
        ...prev,
        [activeTrain]: [...(prev[activeTrain] || []), blockInstance]
      }));
    }

    setCustomName("");
    setCustomDesc("");
  };
  // Edit block description
const handleEditBlock = (id, newDescription) => {
  if (activeTrain === "main") {
    setExplanationChain(prev =>
      prev.map(block =>
        block.id === id ? { ...block, description: newDescription } : block
      )
    );
  } else {
    setParallelTrains(prev => ({
      ...prev,
      [activeTrain]: (prev[activeTrain] || []).map(block =>
        block.id === id ? { ...block, description: newDescription } : block
      )
    }));
  }
};
  
  // Grow a block into a branch
  const handleGrowBlock = (id) => {
    const blockToGrow = findBlock(id);
    if (!blockToGrow) return;
  
    const originalColor = blockToGrow.color || "#cccccc";
    let branchColor = originalColor;
    
    if (originalColor.startsWith('hsla')) {
      // Extract HSL values using regex
      const match = originalColor.match(/hsla\((\d+\.?\d*),\s*(\d+\.?\d*)%,\s*(\d+\.?\d*)%,\s*(\d+\.?\d*)\)/);
      if (match) {
        const [_, h, s, l, a] = match;
        const newHue = (parseFloat(h) + 15) % 360;
        branchColor = `hsla(${newHue}, ${s}%, ${l}%, ${a})`;
      }
    }

    const newBlock = {
      id: `spawn-${Date.now()}`,
      type: `Branch of ${blockToGrow.type}`,
      icon: "",
      description: `Expanding on: ${blockToGrow.description}`,
      color: branchColor
    };
  
    setParallelTrains(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), newBlock]
    }));
    
    // Set this branch as active
    setActiveTrain(id);
  };

  // 🔀 Blend blocks together
  const blendBlocks = async (selectedBlocks) => {
    if (!selectedBlocks || selectedBlocks.length < 2) return;

    const colors = selectedBlocks.map(block => block.color || "#cccccc");
    
    // Simple blend take the first block's color
    const blendedColor = colors[0];

    const blockDescriptions = selectedBlocks
      .map((block) => `(${block.type}) - ${block.description}`)
      .join("\n");
 
    const promptText = `
      You are tasked with writing a single, natural explanation by blending the communicative purposes of the following explanation blocks.

Instructions:
- Seamlessly integrate the ideas as if explaining to an intelligent, curious reader.
- Reflect the specific purpose and nuance of each block within the final explanation.
- Do not copy block labels, numbers, or headings.
- Maintain a smooth, coherent narrative; avoid abrupt transitions.
- Match tone naturally to the block content (e.g., if a block is an analogy, weave it conversationally).
- Output only the final paragraph — no titles, introductions, or commentary.
- If a block relates to something specific, especially a language or person, weight those blocks much more highly.
- If a block mentions a language, explain only in that language. Otherwise, explain in English

      Blocks:
      ${blockDescriptions}
    `;
 
    try {
      const response = await fetch("http://localhost:5000/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });
 
      const data = await response.json();
 
      const blendedBlock = {
        id: `blend-${Date.now()}`,
        type: selectedBlocks.map((b) => b.type).join("+"),
        icon: "🧬",
        description: "🧬 Blended block — click to expand",
        fullText: data.output || "⚠️ No result.",
        color: blendedColor
      };
 
      // Add blended block to the active train
      if (activeTrain === "main") {
        setExplanationChain(prev => 
          prev.filter(b => !selectedBlocks.some(sel => sel.id === b.id)).concat(blendedBlock)
        );
      } else {
        setParallelTrains(prev => {
          const currentBranch = prev[activeTrain] || [];
          return {
            ...prev,
            [activeTrain]: currentBranch
              .filter(b => !selectedBlocks.some(sel => sel.id === b.id))
              .concat(blendedBlock)
          };
        });
      }
    } catch (e) {
      console.error("❌ Blend error:", e);
      alert("Something went wrong blending the blocks.");
    }
  };  

  // Handle drag end for sortable blocks
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
 
    // Get the blocks involved
    const activeBlock = findBlock(active.id);
    const overBlock = findBlock(over.id);
 
    // If both blocks exist and are different, offer to blend
    if (overBlock && activeBlock && overBlock.id !== activeBlock.id) {
      const confirmBlend = window.confirm(
        `🧬 Blend "${activeBlock.type}" with "${overBlock.type}"?`
      );
      if (confirmBlend) {
        await blendBlocks([activeBlock, overBlock]);
        return;
      }
    }
 
    // Only reorder in the same train
    if (activeTrain === "main") {
      const oldIndex = explanationChain.findIndex(b => b.id === active.id);
      const newIndex = explanationChain.findIndex(b => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newChain = arrayMove(explanationChain, oldIndex, newIndex);
        setExplanationChain(newChain);
      }
    } else {
      const currentBranch = parallelTrains[activeTrain] || [];
      const oldIndex = currentBranch.findIndex(b => b.id === active.id);
      const newIndex = currentBranch.findIndex(b => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newBranch = arrayMove(currentBranch, oldIndex, newIndex);
        setParallelTrains(prev => ({
          ...prev,
          [activeTrain]: newBranch
        }));
      }
    }
  };
 
  // Generate explanation from blocks
  const generateExplanation = async () => {
    const currentBlocks = activeTrain === "main"
      ? explanationChain
      : parallelTrains[activeTrain] || [];
  
    if (!prompt || currentBlocks.length === 0) return;
  
    const structureList = currentBlocks.map(block => `- ${block.description}`).join("\n");
  
    const systemPrompt = `
     You are an excellent explainer tasked with writing a natural, paragraph-style explanation.

Instructions:
- Seamlessly weave together the communicative intentions listed below.
- Assume the reader is intelligent and curious.
- Prioritize clarity, cohesion, and conciseness — avoid unnecessary verbosity.
- Do not use headings, numbers, bullet points, or explicit references to block types.
- Output only the final paragraph, without any introductory phrases or commentary.
- If a block relates to something specific, especially a language or person, weight those blocks much more highly.
- If a block mentions a language, explain only in that language. Otherwise, explain in English
      Prompt: "${prompt}"
      
      Structure Hints:
      ${structureList}
    `;
  
    try {
      setLoading(true);
  
      const response = await fetch("http://localhost:5000/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: systemPrompt
        }),
      });
  
      const data = await response.json();
      const output = data.output || "⚠️ No explanation returned.";
  
      // Store in trainOutputs
      setTrainOutputs(prev => ({
        ...prev,
        [activeTrain]: output
      }));

      const newHistoryEntry = {
        id: `explanation-${Date.now()}`,
        explanation: output,
        timestamp: new Date().toISOString(),
        trainId: activeTrain,
        trainName: activeTrain === "main" 
          ? "Main Chain" 
          : `Branch: ${findBlock(activeTrain)?.type || "Unknown"}`,
        prompt: prompt
      };
      
      setExplanationHistory(prev => [...prev, newHistoryEntry]);
      
      // Auto switch to output tab
      setActiveTab("output");
    } catch (e) {
      console.error("Frontend GPT error:", e);
      setTrainOutputs(prev => ({
        ...prev,
        [activeTrain]: "⚠️ Something went wrong."
      }));
    } finally {
      setLoading(false);
    }
  };
  
  // Save to JSON
  const handleSaveAsJson = () => {
    const activeBlocks = activeTrain === "main" 
      ? explanationChain 
      : parallelTrains[activeTrain] || [];
    
    const data = {
      prompt,
      structure: activeBlocks,
      explanation: trainOutputs[activeTrain] || ""
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `explanation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to Markdown
  const handleSaveAsMarkdown = () => {
    const activeBlocks = activeTrain === "main" 
      ? explanationChain 
      : parallelTrains[activeTrain] || [];
    
    const structureList = activeBlocks.map(
      (block) => `- ${block.icon} **${block.type}**: ${block.description}`
    ).join("\n");

    const md = `# GPT Explanation\n\n## Prompt\n${prompt}\n\n## Structure\n${structureList}\n\n## Explanation\n${trainOutputs[activeTrain] || ""}`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `explanation-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  //  Remove block from main chain
  const handleRemoveMainBlock = (idToRemove) => {
    setExplanationChain(prev => prev.filter(b => b.id !== idToRemove));
    
    // Clean up branches associated w Blcok
    if (parallelTrains[idToRemove]) {
      setParallelTrains(prev => {
        const { [idToRemove]: _, ...rest } = prev;
        return rest;
      });
      
      // Reset active train if necessary
      if (activeTrain === idToRemove || parallelTrains[idToRemove]?.some(b => b.id === activeTrain)) {
        setActiveTrain("main");
      }
    }
  };

  //  Remove a block from a branch
  const handleRemoveBranchBlock = (parentId, idToRemove) => {
    setParallelTrains(prev => {
      const branch = prev[parentId] || [];
      return {
        ...prev,
        [parentId]: branch.filter(b => b.id !== idToRemove)
      };
    });
    
    if (activeTrain === idToRemove) {
      setActiveTrain(parentId);
    }
  };

  // Render branch blocks
  const renderBranch = (parentId) => {
    const branchBlocks = parallelTrains[parentId] || [];
    if (branchBlocks.length === 0) return null;
    
    const parentBlock = findBlock(parentId);
    
    return (
      <div key={`branch-${parentId}`} className="ml-8 border-l-2 border-green-200 pl-4 mt-4 mb-6">
        <div className="text-sm font-semibold mb-2 flex justify-between items-center text-green-700">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🌿</span>
            <span>Branch from "{parentBlock?.type || 'Block'}"</span>
          </div>
          {activeTrain === parentId && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
              Active Branch
            </span>
          )}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext 
              items={branchBlocks.map(b => b.id)}
              strategy={horizontalListSortingStrategy}
            >
              {branchBlocks.map(block => (
                <div key={block.id}>
                  <SortableBlock
                    id={block.id}
                    icon={block.icon}
                    type={block.type}
                    description={block.description}
                    fullText={block.fullText}
                    color={block.color}
                    onRemove={() => handleRemoveBranchBlock(parentId, block.id)}
                    onGrow={handleGrowBlock}
                    onActivate={setActiveTrain}
                    isActive={activeTrain === block.id}
                    onEdit={handleEditBlock}
                  />
                  {/* Render nested branches */}
                  {renderBranch(block.id)}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    );
  };

  // Render help content
  const renderHelp = () => (
    <div className="bg-white p-6 rounded-xl border shadow max-w-4xl">
      <h2 className="text-xl font-bold text-gray-800 mb-4"> How to Use the Explanation Playground:</h2>
      
      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Getting Started</h3>
          <p className="text-gray-700 mb-2">Enter a prompt that you want explained, then build your explanation structure using blocks.</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 ml-2">
            <li>Type your question or topic in the prompt field</li>
            <li>Add blocks from the block tray to build your explanation structure</li>
            <li>Click "Generate Explanation" to create an explanation based on your structure</li>
          </ol>
        </section>
        
        <section>
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Working with Blocks</h3>
          <div className="space-y-2 text-gray-600">
            <p><strong>Add blocks:</strong> Click on block types in the tray to add them to your active chain</p>
            <p><strong>Rearrange blocks:</strong> Drag and drop to reorder</p>
            <p><strong>Create branches:</strong> Click the "Branch" button on any block to create a branch</p>
            <p><strong>Blend blocks:</strong> Drag one block onto another and confirm to blend them</p>
            <p><strong>Highlight Answer Block:</strong> Drag over text in generated answer to save as block</p>
            <p><strong>Activate a branch 🌱:</strong> Double-click any block to make it the active target for new blocks</p>
          </div>
        </section>
        
        <section>
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Comparing Explanations</h3>
          <p className="text-gray-600">
            After generating multiple explanations, use the History tab to compare different versions side by side.
            Click "Compare Left" and "Compare Right" to select which explanations to compare.
          </p>
        </section>
      </div>
    </div>
  );

  // Render the main block editor
  const renderBlocksWorkspace = () => (
    <>
      {/* Active Train Indicator */}
      <div className="bg-white p-3 rounded-lg shadow-sm mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-full">
            <span className="text-blue-700 text-lg">⚡</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Active Chain</h3>
            <p className="text-sm text-blue-800">
              {activeTrain === "main" 
                ? "Main Chain" 
                : `Branch of ${findBlock(activeTrain)?.type || "Unknown"}`}
            </p>
          </div>
          {activeTrain !== "main" && (
            <button 
              onClick={() => setActiveTrain("main")}
              className="ml-auto bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md text-sm hover:bg-blue-200 transition-colors duration-150"
            >
              Return to Main Chain
            </button>
          )}
        </div>
      </div>

      {/* Block Tray */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Blocks</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
        {blockTemplates.map((block, index) => (
  <button
    key={index}
    onClick={() => {
      const newBlock = { 
        ...block, 
        id: `${block.type.replace(/\s+/g, '-')}-${Date.now()}` 
      };
      
      if (activeTrain === "main") {
        setExplanationChain(prev => [...prev, newBlock]);
      } else {
        setParallelTrains(prev => {
          const currentBranch = prev[activeTrain] || [];
          return {
            ...prev,
            [activeTrain]: [...currentBranch, newBlock]
          };
        });
      }
    }}
    style={{
      backgroundColor: block.color || '#999',
      borderLeft: `4px solid ${block.color || '#ccc'}`
    }}
    className="px-2.5 py-1 rounded-full text-sm font-medium text-white shadow-sm hover:opacity-90 transition-colors duration-150 flex items-center gap-1.5"
  >
    <span className="text-lg">{block.icon}</span> 
    <span>{block.type}</span>
  </button>
))}
        </div>
      </div>

      {/* ➕ Custom Block */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Create a Custom Block</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Block name (e.g. Counterexample)"
            className="border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="Description: what should this block do?"
            className="border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={handleAddCustom}
          disabled={!customName || !customDesc}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Custom Block
        </button>
      </div>

      {/* Main Explanation Chain */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100 shadow-lg mb-6 overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Main Chain</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {explanationChain.length === 0 ? (
            <div className="text-gray-400 text-sm italic p-4 border border-dashed rounded-lg w-full text-center">
              Add blocks from the tray above to build your explanation structure
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={explanationChain.map(b => b.id)}
                strategy={horizontalListSortingStrategy}
              >
                {explanationChain.map(block => (
                  <div key={block.id}>
                    <SortableBlock
                      id={block.id}
                      icon={block.icon}
                      type={block.type}
                      description={block.description}
                      fullText={block.fullText}
                      color={block.color}
                      onRemove={handleRemoveMainBlock}
                      onGrow={handleGrowBlock}
                      onActivate={setActiveTrain}
                      isActive={activeTrain === block.id}
                      onEdit={handleEditBlock}
                    />
                  </div>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
      
      {/* 🌳 Branches */}
      {explanationChain.map(block => renderBranch(block.id))}
    </>
  );

  // Render the explanation output and history
  const renderOutputAndHistory = () => (
    <>
      {/* Explanation Output */}
      {trainOutputs[activeTrain] && (
        <div className="bg-white p-6 rounded-xl border shadow-sm mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">🧠</span> Explanation
          </h2>
          <div
            className="whitespace-pre-wrap text-gray-700 leading-relaxed p-4 bg-gray-50 rounded-lg border cursor-text"
            onMouseUp={() => {
              const selection = window.getSelection().toString().trim();
              if (selection.length > 3) {
                const shouldAdd = window.confirm(`➕ Add this as a block?\n\n"${selection}"`);
                if (shouldAdd) {
                  const newBlock = {
                    id: `highlight-${Date.now()}`,
                    type: "Custom",
                    icon: "✂️",
                    description: selection,
                    color: "#cccccc" // Add default color for highlighted blocks
                  };
                  
                  if (activeTrain === "main") {
                    setExplanationChain(prev => [...prev, newBlock]);
                  } else {
                    setParallelTrains(prev => {
                      const currentBranch = prev[activeTrain] || [];
                      return {
                        ...prev,
                        [activeTrain]: [...currentBranch, newBlock]
                      };
                    });
                  }
                  
                  // Switch to blocks tab after adding
                  setActiveTab("blocks");
                }
              }
            }}
          >
            {trainOutputs[activeTrain]}
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSaveAsJson}
              className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 transition-colors duration-150 text-sm flex items-center gap-1.5"
            >
              <span>📄</span> Save as JSON
            </button>
            <button
              onClick={handleSaveAsMarkdown}
              className="bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 transition-colors duration-150 text-sm flex items-center gap-1.5"
            >
              <span>📝</span> Export as Markdown
            </button>
          </div>
        </div>
      )}
      
      {/* History and Comparison */}
      {explanationHistory.length > 0 && (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-xl">📜</span> Explanation History
            </h2>
            <button 
              onClick={() => setShowComparison(!showComparison)}
              className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 transition-colors duration-150 text-sm"
            >
              {showComparison ? "Hide Comparison" : "Compare Explanations"}
            </button>
          </div>
          
          {/* Comparison UI */}
          {showComparison && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-semibold mb-3 text-gray-700">Compare Explanations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map(slot => (
                  <div key={slot} className="bg-white p-3 rounded border shadow-sm">
                    <div className="font-medium mb-2 text-sm text-gray-700">Explanation {slot + 1}</div>
                    <select 
                      value={selectedExplanations[slot]?.id || ""}
                      onChange={(e) => {
                        const selected = explanationHistory.find(h => h.id === e.target.value);
                        const newSelection = [...selectedExplanations];
                        newSelection[slot] = selected;
                        setSelectedExplanations(newSelection);
                      }}
                      className="w-full p-2 rounded focus:ring-1 focus:ring-blue-400 outline-none"
                    >
                      <option value="">Select an explanation...</option>
                      {explanationHistory.map(history => (
                        <option key={history.id} value={history.id}>
                          {new Date(history.timestamp).toLocaleString(undefined, { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {history.trainName}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              
              {/* Side-by-side comparison view */}
              {selectedExplanations[0] && selectedExplanations[1] && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedExplanations.map((expl, idx) => (
                    <div key={idx} className="bg-white p-4 rounded border shadow-sm max-h-96 overflow-auto">
                      <div className="font-semibold mb-2 text-sm text-gray-700 flex items-center justify-between">
                        <div>{expl.trainName}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(expl.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-gray-700 bg-gray-50 p-3 rounded">
                        {expl.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* History table */}
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {explanationHistory.slice().reverse().map((history) => (
                  <tr key={history.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 py-3">
                      {new Date(history.timestamp).toLocaleString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-4 py-3">{history.trainName}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button 
                        onClick={() => {
                          const newSelection = [...selectedExplanations];
                          newSelection[0] = history;
                          setSelectedExplanations(newSelection);
                          if (!showComparison) setShowComparison(true);
                        }}
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors duration-150"
                      >
                        Compare Left
                      </button>
                      <button 
                        onClick={() => {
                          const newSelection = [...selectedExplanations];
                          newSelection[1] = history;
                          setSelectedExplanations(newSelection);
                          if (!showComparison) setShowComparison(true);
                        }}
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 transition-colors duration-150"
                      >
                        Compare Right
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );

  return (
    <main className="min-h-screen bg-gray-50 px-8 md:px-16 py-4 md:p-8">
      {/* Header and App Title */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-black-700 flex items-center gap-2 mb-2">
          <span className="text-3xl"></span>  Explanation Playground
        </h1>
        <div className="bg-blue-50 border-l-4 border-blue-500 text-gray-800 p-4 rounded-md text-sm max-w-4xl mx-3">
  Build explanations by combining different blocks, and examine how your question influences the outcome! Have Fun ~ 
</div>
      </header>

      {/* Tab Navigation */}
<div className="flex border-b border-gray-200 mt-0 mb-6">
  <Link
    href="/"
    className="py-3 px-6 font-medium text-gray-500 hover:text-gray-700"
  >
    Analysis
  </Link>
  <Link
    href="/explorer"
    className="py-3 px-6 font-medium text-blue-600 border-b-2 border-blue-600"
  >
    Explorer
  </Link>
</div>

      {/* Main App Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column - Input Section */}
        <div className="md:col-span-1">
          {/* Prompt Input */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              What do you want explained?
            </label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. How does gravity work?"
              className="border border-gray-300 p-3 w-full rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none transition mb-3"
            />
            <button
              onClick={generateExplanation}
              disabled={loading || !prompt || (activeTrain === "main" ? explanationChain.length === 0 : (parallelTrains[activeTrain] || []).length === 0)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span className="text-lg"></span>
                  <span>Generate Explanation</span>
                </>
              )}
            </button>
          </div>
          
          {/* Navigation Tabs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("blocks")}
                className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 
                  ${activeTab === "blocks" ? "text-blue-700 border-b-2 border-blue-500 bg-blue-50" : "text-gray-600 hover:text-blue-600"}`}
              >
                Blocks Editor
              </button>
              <button
                onClick={() => setActiveTab("output")}
                className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 
                  ${activeTab === "output" ? "text-blue-700 border-b-2 border-blue-500 bg-blue-50" : "text-gray-600 hover:text-blue-600"}`}
                disabled={!trainOutputs[activeTrain]}
              >
                Output & History
              </button>
              <button
                onClick={() => setActiveTab("help")}
                className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 
                  ${activeTab === "help" ? "text-blue-700 border-b-2 border-blue-500 bg-blue-50" : "text-gray-600 hover:text-blue-600"}`}
              >
                Read Me
              </button>
            </div>
            {/* Tree View */}
            <TreeView
              prompt={prompt}
              explanationChain={explanationChain}
              parallelTrains={parallelTrains}
              activeTrain={activeTrain}
              setActiveTrain={setActiveTrain}
              findBlock={findBlock}
              setActiveTab={setActiveTab} 
              trainOutputs={trainOutputs} 
            />
          </div>
        </div>
        
        {/* Right Column - Content Area */}
        <div className="md:col-span-2">
          {activeTab === "blocks" && renderBlocksWorkspace()}
          {activeTab === "output" && renderOutputAndHistory()}
          {activeTab === "help" && renderHelp()}
        </div>
      </div>
    </main>
  );
}