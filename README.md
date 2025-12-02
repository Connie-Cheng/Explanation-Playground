# Explanation Playground

Hi All! Welcome to the Read Me! (ˊᵕˋ)♡.°⑅

🧠 My project: Explanation Explorer
A visual playground for building and analyzing explanations using reusable blocks of reasoning. I wanted people to be able to compare explanation strategies across topics, visualize answer structures, and play around with generate natural language explanations with the reasoning blocks to think about how questions also shape answers. I've always been interested in HCI and may extend this to comparing human and AI reasoning on my own time after this class.

✨ Some features:

In the analysis tab

🧱 Explanation Blocks
Each block represents a formal element like a Claim, Example, or Definition, etc These blocks are visually draggable and can be blended, branched, or custom-defined.

🔍 Compare how different explanation types show up across sites or questions, sort by block type etc

🎲 View randomized answer samples and their breakdowns

📊 Visualize patterns with bar, pie, or treemap charts

In the exploration tab

✍️ Enter a prompt (e.g., “How does gravity work?”)

🧩 Compose answers using modular “blocks” (e.g., Definition, Analogy, Claim, etc.), Click Generate to have GPT write a explanation

🌿 Branch ideas and see how changes in prompt and explanation format influence generated answer

🧬 Compare versions side-by-side

Can save explanations to JSON or Markdown
There is also Read me in the UI if you want to quickly see all the options!

___________________________________________________________

🚀 Getting Started
1. Install dependencies
bash
Copy
Edit
npm install

3. Run the dev server
bash
Copy
Edit
npm run dev
By default, the app runs at http://localhost:3000

📁 File Structure

Backend folder -> package and server stuff here, to get generation you need to hook up a GPT API Key -> i just made an .env, with -> REACT_APP_OPENAI_API_KEY=sk-...

Public folder -> has my data files 
-> block_summary.json → Stats about block types across sites
-> answer_samples.json → Raw QA data with annotated blocks
-> combined_human_dataset.json -> aggregated QA dataset
-> top_blocks_by_site.json -> Data about top blocks, to avoid loading data

Src\app folder -> Answer folder and also Explorer
-> Answer folder 
  -> page.tsx
    This is the main entry point for the /answer route:
    Loads block summary and QA sample data.
    Allows users to select sites, block types, and metrics.
    Renders interactive Plotly visualizations (bar, pie, treemap).
    Shows block distribution per site.
    Offers a random sample viewer with block toggling.

 -> BlockHoverDetails
      Handles the tooltip-like UI that pops up when you hover over block type buttons. It shows:
      Stats (total count, avg %/position)
      Top sites using that block
      Color indicator

-> Explorer folder 
   -> page.tsx
      This is a huge file and the main entry for the /explorer route. It handles:
      Building explanation chains with drag-and-drop (@dnd-kit)
      Custom block creation
      Branching (🌱) logic for nested explanations
      GPT interaction (via /api/explain or similar)
      Explanation history and comparison view
      Tabbed layout (blocks vs output vs help)

  ->  TreeView.tsx
      This shows the sidebar tree visualization
      Displays branches and trains visually
      Lets the user click to switch between explanation chains
      UI for navigating nested logic chains

-> Types folder has another page.tsx for the analysis interface and functionality. My code management was not good here - I just kept writing in one place when I should have distributed code to smaller pages... a bit of a headache.
    -> page.tsx
       Analysis Interface
       Chart visualizations using Plotly
___________________________________________________

🧼 A bit on the stack

TypeScript + Tailwind + Next.js

Plotly.js for interactive charts

DnD-Kit for drag-and-drop

Data Processing and Analysis done in Google Colab

Put together in VS code on my computer, sorry for not using the 4.033 editor

__________________________________________________
That's All! I hope you enjoy my project - I had a great time this semester!
As always, thanks so much for your time and consideration!

- Connie
